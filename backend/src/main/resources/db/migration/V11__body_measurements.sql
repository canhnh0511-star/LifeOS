-- Body measurements (B-24, ADR-035): user-defined metrics (the defaults weight/waist/body fat are ordinary rows created on first read)
-- and one value per metric per day. They give no XP and take no part in the ledger.
CREATE TABLE metrics (
    id         UUID PRIMARY KEY,
    user_id    UUID         NOT NULL REFERENCES users (id),
    name       VARCHAR(40)  NOT NULL,
    unit       VARCHAR(12)  NOT NULL DEFAULT '',
    builtin    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL
);
CREATE UNIQUE INDEX uq_metrics_user_name ON metrics (user_id, lower(name));

CREATE TABLE measurements (
    id         UUID PRIMARY KEY,
    metric_id  UUID          NOT NULL REFERENCES metrics (id) ON DELETE CASCADE,
    user_id    UUID          NOT NULL REFERENCES users (id),
    entry_date DATE          NOT NULL,
    value      NUMERIC(10,2) NOT NULL CHECK (value > 0),
    created_at TIMESTAMPTZ   NOT NULL,
    updated_at TIMESTAMPTZ   NOT NULL,
    UNIQUE (metric_id, entry_date)
);
CREATE INDEX idx_measurements_user ON measurements (user_id);
