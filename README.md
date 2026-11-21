# Chat Backend API

A real-time messaging backend built using **Node.js, Express.js, TypeScript, PostgreSQL, and Firebase Firestore**.

This project provides REST APIs for one-to-one chat creation, message sending, message retrieval, read receipts, last-seen tracking, and user chat listing.

## Features

- Create one-to-one conversations between two users.
- Prevent duplicate conversations between the same users.
- Send messages with sender information and timestamps.
- Retrieve chat messages with pagination limits.
- Mark messages as read.
- Track users' last-seen messages.
- Retrieve all conversations associated with a user.
- Validate request parameters and request bodies using Zod.
- Centralized error handling.
- Strict TypeScript configuration.
- PostgreSQL relational database integration.
- Firebase Firestore integration for message storage.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Backend runtime |
| Express.js | REST API framework |
| TypeScript | Type safety |
| PostgreSQL | Users and chat metadata |
| Firebase Firestore | Messages, read receipts and last-seen data |
| Firebase Admin SDK | Server-side Firestore access |
| Zod | Request validation |
| pg | PostgreSQL database connection |
| dotenv | Environment configuration |
| CORS | Cross-origin resource sharing |

## Architecture

The application uses a hybrid database architecture.

### PostgreSQL

PostgreSQL stores relational data:

- Users
- Chat conversations
- Chat participants
- Conversation creation timestamps

### Firebase Firestore

Firestore stores messaging-related data:

- Messages
- Message timestamps
- Read receipts
- User last-seen information

### Data Structure

```text
PostgreSQL
│
├── users
│   ├── id
│   ├── name
│   ├── email
│   └── created_at
│
└── chats
    ├── id
    ├── user_a_id
    ├── user_b_id
    └── created_at


Firebase Firestore
│
└── chats
    └── {chatId}
        │
        ├── messages
        │   └── {messageId}
        │       ├── senderId
        │       ├── text
        │       └── createdAt
        │
        └── lastSeen
            └── {userId}
                ├── messageId
                ├── messageCreatedAt
                └── updatedAt

        messages
            └── {messageId}
                └── readReceipts
                    └── {userId}
                        └── readAt
```

## 📁 Project Structure

```text
chat-backend/
│
├── src/
│   ├── config/
│   │   ├── db.ts
│   │   └── firebase.ts
│   │
│   ├── controllers/
│   │
│   ├── middlewares/
│   │
│   ├── routes/
│   │   └── chat.routes.ts
│   │
│   ├── services/
│   │
│   ├── utils/
│   │
│   ├── app.ts
│   └── server.ts
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

*Note: Adjust the folder names above if your actual project structure differs.*

## ⚙️ Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/anilsolanki634-cell/chat-backend.git
```

### 2. Navigate to the project

```bash
cd chat-backend
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root.

```env
PORT=5000

DATABASE_URL=postgresql://postgres:password@localhost:5432/chat_app

FIREBASE_PROJECT_ID=your-firebase-project-id

GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

Replace the database password and Firebase project ID with your own values.

### 5. Configure PostgreSQL

Create a PostgreSQL database:

```sql
CREATE DATABASE chat_app;
```

Connect to `chat_app` and create the required tables:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT different_users
        CHECK (user_a_id <> user_b_id),

    CONSTRAINT ordered_users
        CHECK (user_a_id < user_b_id),

    CONSTRAINT unique_one_to_one_chat
        UNIQUE (user_a_id, user_b_id)
);
```

Insert sample users:

```sql
INSERT INTO users (name, email)
VALUES
('Anil', 'anil@example.com'),
('Rahul', 'rahul@example.com')
ON CONFLICT (email) DO NOTHING;
```

Retrieve user IDs:

```sql
SELECT id, name, email FROM users;
```

Use these generated UUIDs when testing the APIs.

### 6. Configure Firebase Firestore

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable Cloud Firestore.
3. Open Project Settings.
4. Navigate to Service Accounts.
5. Generate a new private key for the Firebase Admin SDK.
6. Download the JSON file.
7. Rename it to `serviceAccountKey.json`.
8. Place it in the project root.

**Security:** Never commit `serviceAccountKey.json` or `.env` to GitHub. Each developer should configure their own credentials.

### 7. Run the application

Development mode:

```bash
npm run dev
```

Build TypeScript:

```bash
npm run build
```

Run production build:

```bash
npm start
```

Server URL:

```text
http://localhost:5000
```

## 📡 API Documentation

Base URL:

```text
http://localhost:5000
```

### 1. Create or Get One-to-One Chat

**Endpoint**

```http
POST /chat/create
```

**Request Body**

```json
{
  "userAId": "USER_A_UUID",
  "userBId": "USER_B_UUID"
}
```

**Purpose**

- Creates a new conversation between two users.
- Returns the existing conversation if one already exists.
- Prevents duplicate one-to-one conversations.

### 2. Send Message

**Endpoint**

```http
POST /chat/:chatId/message/send
```

**Request Body**

```json
{
  "senderId": "USER_UUID",
  "text": "Hello Rahul, how are you?"
}
```

**Purpose**

- Validates chat membership.
- Stores the message in Firestore.
- Generates a message ID and creation timestamp.

### 3. Get Chat Messages

**Endpoint**

```http
GET /chat/:chatId/messages?limit=50&userId=USER_UUID
```

**Purpose**

- Retrieves messages for a conversation.
- Validates that the requesting user belongs to the chat.
- Supports a configurable message limit.
- Returns messages in chronological order.

### 4. Mark Message as Read

**Endpoint**

```http
POST /chat/:chatId/message/:messageId/read
```

**Request Body**

```json
{
  "userId": "USER_UUID"
}
```

**Purpose**

- Validates chat membership.
- Checks whether the message exists.
- Stores a read receipt for the user with a timestamp.

### 5. Update Last Seen

**Endpoint**

```http
POST /chat/:chatId/lastseen
```

**Request Body**

```json
{
  "userId": "USER_UUID",
  "messageId": "MESSAGE_UUID"
}
```

**Purpose**

- Updates the user's last-seen message.
- Stores the message reference and timestamp.
- Prevents last-seen position from moving backwards.

### 6. Get User Chats

**Endpoint**

```http
GET /user/:userId/chats
```

**Purpose**

- Retrieves all conversations associated with a user.
- Finds chats where the user is either participant.

## 🧪 API Testing

You can test the endpoints using Postman or any REST API client.

Recommended testing sequence:

1. Retrieve the user IDs from PostgreSQL.
2. Create a conversation.
3. Copy the returned chat ID.
4. Send a message.
5. Retrieve conversation messages.
6. Mark a message as read.
7. Update the last-seen position.
8. Retrieve the user's conversations.

Make sure to use actual UUIDs returned by PostgreSQL and Firestore, not placeholder values.

## 🔐 Security and Validation

- Zod is used to validate incoming API requests.
- UUID validation is applied to relevant identifiers.
- Chat membership is checked before accessing conversation data.
- Environment variables are used for configuration.
- Firebase service account credentials are excluded from version control.
- Centralized error-handling middleware handles API errors.

**Note:** This project is an assignment implementation. Production deployment should additionally include authentication, authorization, rate limiting, Firestore security controls, and stronger operational monitoring.


## 👨‍💻 Author

**Anil Solanki**

GitHub: [anilsolanki634-cell](https://github.com/anilsolanki634-cell)

Project: [Chat Backend](https://github.com/anilsolanki634-cell/chat-backend)
