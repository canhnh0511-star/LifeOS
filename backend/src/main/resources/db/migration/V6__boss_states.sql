-- State of each boss per (user, journey): cycle counts defeats (+1 on every AVAILABLE -> DEFEATED), like quest_instances.cycle.
-- A row exists only once the boss has been fought; no row means "not defeated" (LOCKED/AVAILABLE is derived from area level).
CREATE TABLE boss_states (
    id             UUID PRIMARY KEY,
    user_id        UUID        NOT NULL REFERENCES users (id),
    journey_id     UUID        NOT NULL REFERENCES journeys (id),
    boss_code      VARCHAR(60) NOT NULL,
    status         VARCHAR(10) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','DEFEATED')),
    cycle          INTEGER     NOT NULL DEFAULT 0 CHECK (cycle >= 0),
    defeated_date  DATE,
    defeated_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL,
    UNIQUE (journey_id, boss_code),
    CHECK ((status = 'DEFEATED' AND defeated_date IS NOT NULL AND defeated_at IS NOT NULL AND cycle >= 1)
        OR (status = 'AVAILABLE' AND defeated_date IS NULL AND defeated_at IS NULL))
);
CREATE INDEX idx_boss_states_user ON boss_states (user_id);

-- The ledger now also carries boss events (source_id = boss_states.id). Sign must still match the event.
ALTER TABLE xp_transactions DROP CONSTRAINT xp_transactions_source_type_check;
ALTER TABLE xp_transactions DROP CONSTRAINT xp_transactions_event_type_check;
ALTER TABLE xp_transactions DROP CONSTRAINT xp_transactions_check;
ALTER TABLE xp_transactions ADD CONSTRAINT xp_transactions_source_type_check CHECK (source_type IN ('QUEST','BOSS'));
ALTER TABLE xp_transactions ADD CONSTRAINT xp_transactions_event_type_check CHECK (event_type IN ('QUEST_COMPLETE','QUEST_REVERT','BOSS_COMPLETE','BOSS_REVERT'));
ALTER TABLE xp_transactions ADD CONSTRAINT xp_transactions_sign_check CHECK (
    (event_type IN ('QUEST_COMPLETE','BOSS_COMPLETE') AND amount > 0) OR (event_type IN ('QUEST_REVERT','BOSS_REVERT') AND amount < 0));
-- The event type fixes the source type, so a boss event can never point at a quest and vice versa.
ALTER TABLE xp_transactions ADD CONSTRAINT xp_transactions_source_matches_event CHECK (
    (source_type = 'QUEST' AND event_type IN ('QUEST_COMPLETE','QUEST_REVERT')) OR (source_type = 'BOSS' AND event_type IN ('BOSS_COMPLETE','BOSS_REVERT')));
