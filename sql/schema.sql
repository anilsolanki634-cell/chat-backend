CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_a_id UUID NOT NULL REFERENCES users(id)
        ON DELETE CASCADE,

    user_b_id UUID NOT NULL REFERENCES users(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT different_users
        CHECK (user_a_id <> user_b_id),

    CONSTRAINT ordered_users
        CHECK (user_a_id < user_b_id),

    CONSTRAINT unique_one_to_one_chat
        UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_chats_user_a
    ON chats(user_a_id);

CREATE INDEX IF NOT EXISTS idx_chats_user_b
    ON chats(user_b_id);