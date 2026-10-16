-- One journey (default 66 days) per user for now; created lazily on first read, starting on the user's registration day.
-- Status is derived (ACTIVE until the last day has passed), so nothing here needs rewriting as days go by.
CREATE TABLE journeys (
    id            UUID PRIMARY KEY,
    user_id       UUID         NOT NULL UNIQUE REFERENCES users (id),
    title         VARCHAR(100) NOT NULL,
    start_date    DATE         NOT NULL,
    duration_days INTEGER      NOT NULL CHECK (duration_days BETWEEN 7 AND 365),
    created_at    TIMESTAMPTZ  NOT NULL
);
