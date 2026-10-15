CREATE TABLE users (
    id            UUID PRIMARY KEY,
    email         VARCHAR(254) NOT NULL,
    display_name  VARCHAR(60)  NOT NULL,
    timezone      VARCHAR(64)  NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    password_hash VARCHAR(100) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT users_email_lowercase CHECK (email = lower(email))
);
CREATE UNIQUE INDEX users_email_key ON users (email);
