import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createOrGetChat,
  sendMessage,
  getMessages,
  markMessageRead,
  updateLastSeen,
  listUserChats,
} from "../services/chat.service.js";

const router = Router();

const uuidSchema = z.string().uuid();

const createChatSchema = z.object({
  userAId: uuidSchema,
  userBId: uuidSchema,
});

const sendMessageSchema = z.object({
  senderId: uuidSchema,
  text: z.string().trim().min(1).max(5000),
});

const userIdSchema = z.object({
  userId: uuidSchema,
});

const lastSeenSchema = z.object({
  userId: uuidSchema,
  messageId: z.string().min(1),
});

// --------------------------------------------------
// POST /chat/create
// --------------------------------------------------

router.post(
  "/chat/create",
  asyncHandler(async (req, res) => {
    const body = createChatSchema.parse(req.body);

    const chat = await createOrGetChat(
      body.userAId,
      body.userBId
    );

    res.status(200).json({
      success: true,
      data: chat,
    });
  })
);

// --------------------------------------------------
// POST /chat/:chatId/message/send
// --------------------------------------------------

router.post(
  "/chat/:chatId/message/send",
  asyncHandler(async (req, res) => {
    const chatId = uuidSchema.parse(
      req.params.chatId
    );

    const body = sendMessageSchema.parse(req.body);

    const message = await sendMessage(
      chatId,
      body
    );

    res.status(201).json({
      success: true,
      data: message,
    });
  })
);

// --------------------------------------------------
// GET /chat/:chatId/messages?limit=50&userId=...
// --------------------------------------------------

router.get(
  "/chat/:chatId/messages",
  asyncHandler(async (req, res) => {
    const chatId = uuidSchema.parse(
      req.params.chatId
    );

    const querySchema = z.object({
      userId: uuidSchema,
      limit: z.coerce.number()
        .int()
        .min(1)
        .max(100)
        .default(50),
    });

    const query = querySchema.parse(req.query);

    const messages = await getMessages(
      chatId,
      query.userId,
      query.limit
    );

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  })
);

// --------------------------------------------------
// POST /chat/:chatId/message/:messageId/read
// --------------------------------------------------

router.post(
  "/chat/:chatId/message/:messageId/read",
  asyncHandler(async (req, res) => {
    const chatId = uuidSchema.parse(
      req.params.chatId
    );

    const messageId = z.string().min(1).parse(
      req.params.messageId
    );

    const body = userIdSchema.parse(req.body);

    const result = await markMessageRead(
      chatId,
      messageId,
      body.userId
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

// --------------------------------------------------
// POST /chat/:chatId/lastseen
// --------------------------------------------------

router.post(
  "/chat/:chatId/lastseen",
  asyncHandler(async (req, res) => {
    const chatId = uuidSchema.parse(
      req.params.chatId
    );

    const body = lastSeenSchema.parse(req.body);

    const result = await updateLastSeen(
      chatId,
      body.userId,
      body.messageId
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

// --------------------------------------------------
// GET /user/:userId/chats
// --------------------------------------------------

router.get(
  "/user/:userId/chats",
  asyncHandler(async (req, res) => {
    const userId = uuidSchema.parse(
      req.params.userId
    );

    const chats = await listUserChats(userId);

    res.status(200).json({
      success: true,
      count: chats.length,
      data: chats,
    });
  })
);

export default router;