-- One row per (user, habit, local date) once that day has been lived. Created lazily by reads, never awards XP.
-- category and xp_reward are snapshots taken at materialization, so later edits cannot rewrite the past.
CREATE TABLE quest_instances (
    id             UUID PRIMARY KEY,
    user_id        UUID        NOT NULL REFERENCES users (id),
    habit_id       UUID        NOT NULL REFERENCES habits (id),
    scheduled_date DATE        NOT NULL,
    category       VARCHAR(20) NOT NULL CHECK (category IN ('CAREER','CREATIVITY','HEALTH','KNOWLEDGE','MINDFULNESS')),
    xp_reward      INTEGER     NOT NULL CHECK (xp_reward BETWEEN 0 AND 100),
    status         VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMPLETED')),
    completed_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL,
    UNIQUE (user_id, habit_id, scheduled_date),
    CHECK ((status = 'COMPLETED') = (completed_at IS NOT NULL))
);
CREATE INDEX idx_quest_user_date ON quest_instances (user_id, scheduled_date);
