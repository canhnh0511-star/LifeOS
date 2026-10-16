-- Checklist of a habit ("Squat 40 rep", "Nuoc 10 coc"). Replaced as a whole on edit; quests keep their own snapshot below.
CREATE TABLE habit_objectives (
    id       UUID PRIMARY KEY,
    habit_id UUID         NOT NULL REFERENCES habits (id),
    position INTEGER      NOT NULL CHECK (position >= 0),
    title    VARCHAR(100) NOT NULL,
    target   INTEGER      NOT NULL CHECK (target BETWEEN 1 AND 10000),
    unit     VARCHAR(20)  NOT NULL DEFAULT '',
    step     INTEGER      NOT NULL DEFAULT 1 CHECK (step >= 1),
    UNIQUE (habit_id, position)
);

-- Copy taken when a quest is materialized (like xp_reward), so editing the habit never rewrites a lived day.
-- `value` is the progress on that day; the quest completes when every row has value >= target.
CREATE TABLE quest_objectives (
    id       UUID PRIMARY KEY,
    quest_id UUID         NOT NULL REFERENCES quest_instances (id),
    position INTEGER      NOT NULL CHECK (position >= 0),
    title    VARCHAR(100) NOT NULL,
    target   INTEGER      NOT NULL CHECK (target BETWEEN 1 AND 10000),
    unit     VARCHAR(20)  NOT NULL DEFAULT '',
    step     INTEGER      NOT NULL DEFAULT 1 CHECK (step >= 1),
    value    INTEGER      NOT NULL DEFAULT 0 CHECK (value >= 0),
    UNIQUE (quest_id, position)
);
