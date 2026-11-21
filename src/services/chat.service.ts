import { pool } from "../config/db.js";
import { firestore } from "../config/firebase.js";
import { AppError } from "../middleware/errorHandler.js";

import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

interface ChatRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: Date;
}

interface MessageInput {
  senderId: string;
  text: string;
}

interface MessageResponse {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string | null;
}

// --------------------------------------------------
// Helper: Get chat document reference
// --------------------------------------------------

const chatDocument = (chatId: string) =>
  firestore.collection("chats").doc(chatId);

// --------------------------------------------------
// Helper: Check chat exists and user is a member
// --------------------------------------------------

const getChatForMember = async (
  chatId: string,
  userId: string
): Promise<ChatRow> => {
  const result = await pool.query<ChatRow>(
    `
    SELECT id, user_a_id, user_b_id, created_at
    FROM chats
    WHERE id = $1
      AND (user_a_id = $2 OR user_b_id = $2)
    `,
    [chatId, userId]
  );

  const chat = result.rows[0];

  if (!chat) {
    throw new AppError(
      404,
      "Chat not found or user is not a member"
    );
  }

  return chat;
};

// --------------------------------------------------
// 1. Create or get 1:1 chat
// --------------------------------------------------

export const createOrGetChat = async (
  userAId: string,
  userBId: string
) => {
  if (userAId === userBId) {
    throw new AppError(
      400,
      "You cannot create a chat with yourself"
    );
  }

  const users = await pool.query(
    `
    SELECT id
    FROM users
    WHERE id = ANY($1::uuid[])
    `,
    [[userAId, userBId]]
  );

  if (users.rowCount !== 2) {
    throw new AppError(404, "One or both users not found");
  }

  // Always sort IDs to prevent duplicate chats.
  const [firstUserId, secondUserId] =
    userAId < userBId
      ? [userAId, userBId]
      : [userBId, userAId];

  const result = await pool.query<ChatRow>(
    `
    INSERT INTO chats (user_a_id, user_b_id)
    VALUES ($1, $2)
    ON CONFLICT (user_a_id, user_b_id)
    DO UPDATE SET user_a_id = EXCLUDED.user_a_id
    RETURNING id, user_a_id, user_b_id, created_at
    `,
    [firstUserId, secondUserId]
  );

  const chat = result.rows[0];

  return {
    chatId: chat.id,
    memberIds: [chat.user_a_id, chat.user_b_id],
    createdAt: chat.created_at,
  };
};

// --------------------------------------------------
// 2. Send message
// --------------------------------------------------

export const sendMessage = async (
  chatId: string,
  input: MessageInput
): Promise<MessageResponse> => {
  await getChatForMember(chatId, input.senderId);

  const messageRef = chatDocument(chatId)
    .collection("messages")
    .doc();

  await messageRef.set({
    senderId: input.senderId,
    text: input.text,
    createdAt: FieldValue.serverTimestamp(),
  });

  const savedMessage = await messageRef.get();
  const data = savedMessage.data();

  return {
    id: messageRef.id,
    chatId,
    senderId: input.senderId,
    text: input.text,
    createdAt:
      data?.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : null,
  };
};

// --------------------------------------------------
// 3. Get messages
// --------------------------------------------------

export const getMessages = async (
  chatId: string,
  userId: string,
  limit: number
) => {
  await getChatForMember(chatId, userId);

  const messagesRef = chatDocument(chatId)
    .collection("messages");

  // Fetch newest messages first.
  const snapshot = await messagesRef
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  // Return them in chronological order.
  const messages = snapshot.docs
    .map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        chatId,
        senderId: data.senderId as string,
        text: data.text as string,
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : null,
      };
    })
    .reverse();

  return messages;
};

// --------------------------------------------------
// 4. Mark message as read
// --------------------------------------------------

export const markMessageRead = async (
  chatId: string,
  messageId: string,
  userId: string
) => {
  await getChatForMember(chatId, userId);

  const messageRef = chatDocument(chatId)
    .collection("messages")
    .doc(messageId);

  const messageSnapshot = await messageRef.get();

  if (!messageSnapshot.exists) {
    throw new AppError(404, "Message not found");
  }

  const receiptRef = messageRef
    .collection("readReceipts")
    .doc(userId);

  await receiptRef.set(
    {
      userId,
      readAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    chatId,
    messageId,
    userId,
    messageRead: true,
  };
};

// --------------------------------------------------
// 5. Update last seen message
// --------------------------------------------------

export const updateLastSeen = async (
  chatId: string,
  userId: string,
  messageId: string
) => {
  await getChatForMember(chatId, userId);

  const messageRef = chatDocument(chatId)
    .collection("messages")
    .doc(messageId);

  const lastSeenRef = chatDocument(chatId)
    .collection("lastSeen")
    .doc(userId);

  await firestore.runTransaction(async (transaction) => {
    const messageSnapshot =
      await transaction.get(messageRef);

    if (!messageSnapshot.exists) {
      throw new AppError(404, "Message not found");
    }

    const messageData = messageSnapshot.data();

    const messageCreatedAt =
      messageData?.createdAt;

    if (!(messageCreatedAt instanceof Timestamp)) {
      throw new AppError(
        400,
        "Message timestamp is not available yet"
      );
    }

    const lastSeenSnapshot =
      await transaction.get(lastSeenRef);

    if (lastSeenSnapshot.exists) {
      const currentData = lastSeenSnapshot.data();

      const currentTimestamp =
        currentData?.messageCreatedAt;

      if (
        currentTimestamp instanceof Timestamp &&
        currentTimestamp.toMillis() >
          messageCreatedAt.toMillis()
      ) {
        // Don't move last seen backwards.
        return;
      }
    }

    transaction.set(
      lastSeenRef,
      {
        userId,
        messageId,
        messageCreatedAt,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  return {
    chatId,
    userId,
    messageId,
    updated: true,
  };
};

// --------------------------------------------------
// 6. List user chats
// --------------------------------------------------

export const listUserChats = async (
  userId: string
) => {
  const userResult = await pool.query(
    "SELECT id FROM users WHERE id = $1",
    [userId]
  );

  if (userResult.rowCount === 0) {
    throw new AppError(404, "User not found");
  }

  const result = await pool.query<ChatRow>(
    `
    SELECT id, user_a_id, user_b_id, created_at
    FROM chats
    WHERE user_a_id = $1 OR user_b_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );

  return result.rows.map((chat) => ({
    chatId: chat.id,
    memberIds: [
      chat.user_a_id,
      chat.user_b_id,
    ],
    createdAt: chat.created_at,
  }));
};



