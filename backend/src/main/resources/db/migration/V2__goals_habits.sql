CREATE TABLE goals (
    id          UUID PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES users (id),
    category    VARCHAR(20)  NOT NULL CHECK (category IN ('CAREER','CREATIVITY','HEALTH','KNOWLEDGE','MINDFULNESS')),
    title       VARCHAR(150) NOT NULL,
    description VARCHAR(600) NOT NULL DEFAULT '',
    -- Latest requested status. When it applies is decided by lifecycle_events (always from the next local day).
    status      VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','ARCHIVED')),
    created_at  TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_goals_user ON goals (user_id, created_at);

CREATE TABLE habits (
    id             UUID PRIMARY KEY,
    user_id        UUID         NOT NULL REFERENCES users (id),
    goal_id        UUID         NOT NULL REFERENCES goals (id),
    title          VARCHAR(150) NOT NULL,
    target_minutes INTEGER      NOT NULL CHECK (target_minutes BETWEEN 1 AND 480),
    xp_reward      INTEGER      NOT NULL CHECK (xp_reward BETWEEN 0 AND 100),
    start_date     DATE         NOT NULL,
    end_date       DATE,
    status         VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','ARCHIVED')),
    created_at     TIMESTAMPTZ  NOT NULL,
    CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX idx_habits_user ON habits (user_id, created_at);
CREATE INDEX idx_habits_goal ON habits (goal_id);

-- Weekly schedule is versioned: a version covers [effective_from, next version). Past versions are never edited.
-- weekday_mask bit (d-1) = ISO weekday d (Mon=1 .. Sun=7).
CREATE TABLE habit_schedule_versions (
    id             UUID PRIMARY KEY,
    habit_id       UUID     NOT NULL REFERENCES habits (id),
    effective_from DATE     NOT NULL,
    weekday_mask   SMALLINT NOT NULL CHECK (weekday_mask BETWEEN 1 AND 127),
    UNIQUE (habit_id, effective_from)
);

-- Pause/resume/archive history. A change recorded today applies from the next local day, so lived days are never rewritten.
CREATE TABLE lifecycle_events (
    id             UUID PRIMARY KEY,
    user_id        UUID        NOT NULL REFERENCES users (id),
    subject_type   VARCHAR(5)  NOT NULL CHECK (subject_type IN ('GOAL','HABIT')),
    subject_id     UUID        NOT NULL,
    effective_date DATE        NOT NULL,
    status         VARCHAR(10) NOT NULL CHECK (status IN ('ACTIVE','PAUSED','ARCHIVED')),
    created_at     TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_lifecycle_subject ON lifecycle_events (subject_type, subject_id, effective_date);
