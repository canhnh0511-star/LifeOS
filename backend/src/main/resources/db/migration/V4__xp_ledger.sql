-- Completion cycle of a quest: 0 = never completed, +1 for every PENDING -> COMPLETED transition.
ALTER TABLE quest_instances ADD COLUMN cycle INTEGER NOT NULL DEFAULT 0 CHECK (cycle >= 0);

-- Append-only XP ledger. SUM(amount) is the only source of truth for XP; there is no stored total to drift.
CREATE TABLE xp_transactions (
    id             UUID PRIMARY KEY,
    user_id        UUID        NOT NULL REFERENCES users (id),
    source_type    VARCHAR(12) NOT NULL CHECK (source_type IN ('QUEST')),
    source_id      UUID        NOT NULL,
    event_type     VARCHAR(20) NOT NULL CHECK (event_type IN ('QUEST_COMPLETE','QUEST_REVERT')),
    cycle          INTEGER     NOT NULL CHECK (cycle >= 1),
    category       VARCHAR(20) NOT NULL CHECK (category IN ('CAREER','CREATIVITY','HEALTH','KNOWLEDGE','MINDFULNESS')),
    amount         INTEGER     NOT NULL CHECK (amount <> 0),
    scheduled_date DATE        NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL,
    -- Sign must match the event: a completion earns, a revert takes back.
    CHECK ((event_type = 'QUEST_COMPLETE' AND amount > 0) OR (event_type = 'QUEST_REVERT' AND amount < 0)),
    UNIQUE (source_type, source_id, cycle, event_type)
);
CREATE INDEX idx_xp_user_category ON xp_transactions (user_id, category);
CREATE INDEX idx_xp_user_date ON xp_transactions (user_id, scheduled_date);

CREATE FUNCTION xp_transactions_immutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'xp_transactions is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER xp_transactions_no_change BEFORE UPDATE OR DELETE ON xp_transactions
    FOR EACH ROW EXECUTE FUNCTION xp_transactions_immutable();
