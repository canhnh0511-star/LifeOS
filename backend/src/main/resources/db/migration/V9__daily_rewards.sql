-- Daily reward chests are ledger events only (no state table): source_type 'DAILY', source_id derived from (user, date, tier).
-- Each chest pays one event per area (like BALANCED) so totalXp = sum of area XP. A revoke is a negative event of the same cycle.
ALTER TABLE xp_transactions DROP CONSTRAINT IF EXISTS xp_transactions_source_type_check;
ALTER TABLE xp_transactions DROP CONSTRAINT IF EXISTS xp_transactions_event_type_check;
ALTER TABLE xp_transactions DROP CONSTRAINT IF EXISTS xp_transactions_sign_check;
ALTER TABLE xp_transactions DROP CONSTRAINT IF EXISTS xp_transactions_source_matches_event;
ALTER TABLE xp_transactions ADD CONSTRAINT xp_transactions_source_type_check CHECK (source_type IN ('QUEST','BOSS','ACHIEVEMENT','DAILY'));
ALTER TABLE xp_transactions ADD CONSTRAINT xp_transactions_event_type_check CHECK (event_type IN
    ('QUEST_COMPLETE','QUEST_REVERT','BOSS_COMPLETE','BOSS_REVERT','ACHIEVEMENT_GRANT','ACHIEVEMENT_REVOKE','DAILY_REWARD_GRANT','DAILY_REWARD_REVOKE'));
ALTER TABLE xp_transactions ADD CONSTRAINT xp_transactions_sign_check CHECK (
    (event_type IN ('QUEST_COMPLETE','BOSS_COMPLETE','ACHIEVEMENT_GRANT','DAILY_REWARD_GRANT') AND amount > 0)
 OR (event_type IN ('QUEST_REVERT','BOSS_REVERT','ACHIEVEMENT_REVOKE','DAILY_REWARD_REVOKE') AND amount < 0));
ALTER TABLE xp_transactions ADD CONSTRAINT xp_transactions_source_matches_event CHECK (
    (source_type = 'QUEST' AND event_type IN ('QUEST_COMPLETE','QUEST_REVERT'))
 OR (source_type = 'BOSS' AND event_type IN ('BOSS_COMPLETE','BOSS_REVERT'))
 OR (source_type = 'ACHIEVEMENT' AND event_type IN ('ACHIEVEMENT_GRANT','ACHIEVEMENT_REVOKE'))
 OR (source_type = 'DAILY' AND event_type IN ('DAILY_REWARD_GRANT','DAILY_REWARD_REVOKE')));
