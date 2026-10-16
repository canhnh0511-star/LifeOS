-- Achievement state per (journey, code): granted at most once per campaign; `cycle` counts grants (a revoke followed by a re-grant is cycle + 1).
-- A row is created lazily the first time achievements are evaluated; ledger events (source_type 'ACHIEVEMENT') carry the XP.
CREATE TABLE achievement_states (
    id          UUID PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users (id),
    journey_id  UUID        NOT NULL REFERENCES journeys (id),
    code        VARCHAR(30) NOT NULL,
    status      VARCHAR(10) NOT NULL DEFAULT 'LOCKED' CHECK (status IN ('LOCKED','EARNED')),
    cycle       INTEGER     NOT NULL DEFAULT 0 CHECK (cycle >= 0),
    earned_date DATE,
    earned_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL,
    UNIQUE (journey_id, code),
    CHECK ((status = 'EARNED' AND earned_date IS NOT NULL AND earned_at IS NOT NULL AND cycle >= 1)
        OR (status = 'LOCKED' AND earned_date IS NULL AND earned_at IS NULL))
);
CREATE INDEX idx_achievement_states_user ON achievement_states (user_id);

-- BALANCED pays 5 events (one per area) for the same source/cycle/type, so the category joins the uniqueness key.
-- Drop the old unnamed UNIQUE(source_type, source_id, cycle, event_type) by its columns, not by its generated name.
DO $$
DECLARE old_name text;
BEGIN
    SELECT con.conname INTO old_name FROM pg_constraint con
    WHERE con.conrelid = 'xp_transactions'::regclass AND con.contype = 'u'
      AND (SELECT array_agg(att.attname::text ORDER BY att.attname) FROM unnest(con.conkey) AS k
           JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k) = ARRAY['cycle','event_type','source_id','source_type'];
    IF old_name IS NOT NULL THEN EXECUTE format('ALTER TABLE xp_transactions DROP CONSTRAINT %I', old_name); END IF;
END $$;
ALTER TABLE xp_transactions ADD CONSTRAINT xp_transactions_event_once UNIQUE (source_type, source_id, cycle, event_type, category);

ALTER TABLE xp_transactions DROP CONSTRAINT IF EXISTS xp_transactions_source_type_check;
ALTER TABLE xp_transactions DROP CONSTRAINT IF EXISTS xp_transactions_event_type_check;
ALTER TABLE xp_transactions DROP CONSTRAINT IF EXISTS xp_transactions_sign_check;
ALTER TABLE xp_transactions DROP CONSTRAINT IF EXISTS xp_transactions_source_matches_event;
ALTER TABLE xp_transactions ALTER COLUMN source_type TYPE VARCHAR(12);
ALTER TABLE xp_transactions ADD CONSTRAINT xp_transactions_source_type_check CHECK (source_type IN ('QUEST','BOSS','ACHIEVEMENT'));
ALTER TABLE xp_transactions ADD CONSTRAINT xp_transactions_event_type_check CHECK (event_type IN
    ('QUEST_COMPLETE','QUEST_REVERT','BOSS_COMPLETE','BOSS_REVERT','ACHIEVEMENT_GRANT','ACHIEVEMENT_REVOKE'));
ALTER TABLE xp_transactions ADD CONSTRAINT xp_transactions_sign_check CHECK (
    (event_type IN ('QUEST_COMPLETE','BOSS_COMPLETE','ACHIEVEMENT_GRANT') AND amount > 0)
 OR (event_type IN ('QUEST_REVERT','BOSS_REVERT','ACHIEVEMENT_REVOKE') AND amount < 0));
ALTER TABLE xp_transactions ADD CONSTRAINT xp_transactions_source_matches_event CHECK (
    (source_type = 'QUEST' AND event_type IN ('QUEST_COMPLETE','QUEST_REVERT'))
 OR (source_type = 'BOSS' AND event_type IN ('BOSS_COMPLETE','BOSS_REVERT'))
 OR (source_type = 'ACHIEVEMENT' AND event_type IN ('ACHIEVEMENT_GRANT','ACHIEVEMENT_REVOKE')));
