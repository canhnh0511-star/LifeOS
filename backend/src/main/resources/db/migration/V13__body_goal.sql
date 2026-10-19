-- The body goal of an account: height, start and target weight over a number of days (default 100). One row per user. Tracking only:
-- no XP, no ledger event, no streak. Progress is computed from the weight measurements the user already records.
CREATE TABLE body_goals (
    user_id          UUID PRIMARY KEY REFERENCES users (id),
    height_cm        INTEGER      NOT NULL CHECK (height_cm BETWEEN 100 AND 250),
    start_weight_kg  NUMERIC(5,1) NOT NULL CHECK (start_weight_kg BETWEEN 20 AND 300),
    target_weight_kg NUMERIC(5,1) NOT NULL CHECK (target_weight_kg BETWEEN 20 AND 300),
    start_date       DATE         NOT NULL,
    days             INTEGER      NOT NULL CHECK (days BETWEEN 14 AND 366),
    created_at       TIMESTAMPTZ  NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL,
    CONSTRAINT body_goals_differs CHECK (start_weight_kg <> target_weight_kg)
);
