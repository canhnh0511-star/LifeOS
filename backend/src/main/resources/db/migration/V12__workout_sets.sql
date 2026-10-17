-- Workout set log (B-34, ADR-037): the sets a user actually did for an exercise of a scheduled quest. A plain record like body
-- measurements: no XP, no ledger event, no streak or chest, and it never completes a quest.
CREATE TABLE workout_sets (
    id         UUID PRIMARY KEY,
    user_id    UUID          NOT NULL REFERENCES users (id),
    habit_id   UUID          NOT NULL REFERENCES habits (id),
    entry_date DATE          NOT NULL,
    exercise   VARCHAR(100)  NOT NULL,
    set_no     INTEGER       NOT NULL CHECK (set_no BETWEEN 1 AND 50),
    reps       INTEGER       NOT NULL CHECK (reps BETWEEN 1 AND 1000),
    weight_kg  NUMERIC(7,2)  CHECK (weight_kg IS NULL OR (weight_kg >= 0 AND weight_kg <= 1000)),
    created_at TIMESTAMPTZ   NOT NULL,
    updated_at TIMESTAMPTZ   NOT NULL
);
-- One row per set of an exercise on a quest; the exercise name is compared ignoring case.
CREATE UNIQUE INDEX uq_workout_sets_set ON workout_sets (user_id, habit_id, entry_date, lower(exercise), set_no);
-- "Last time" lookup: latest earlier day on which this user did this exercise.
CREATE INDEX idx_workout_sets_last ON workout_sets (user_id, lower(exercise), entry_date DESC);
