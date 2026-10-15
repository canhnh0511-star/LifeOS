# Data model — PostgreSQL (backend proposal; NOT applied)

**Do not migrate database before frontend approval.** Tables below are a target design. Implementation belongs in Flyway migrations during B-01 to B-05.

## Core entities

| Entity | Important fields and constraints |
|---|---|
| `users` | UUID id PK, email UNIQUE, display_name, timezone, created_at. Password hash/auth identity if local auth selected |
| `goals` | UUID id PK, user_id FK, category, title, description, status, created_at |
| `habits` | UUID id PK, user_id FK, goal_id FK, title, target_minutes, xp_reward, start_date, end_date, status |
| `habit_schedule_versions` | UUID id PK, habit_id FK, effective_from DATE, effective_to DATE nullable, weekdays SMALLINT[]; no overlapping versions |
| `habit_lifecycle_events` | UUID id PK, habit_id FK, effective_date, event_type=PAUSE/RESUME/ARCHIVE; event history |
| `journeys` | UUID id PK, user_id FK, title, start_date, duration_days, status |
| `quest_instances` | UUID id PK, user_id FK, habit_id FK, scheduled_date DATE, status, reward_snapshot, category_snapshot, completed_at, cycle INTEGER, UNIQUE(user_id,habit_id,scheduled_date) |
| `xp_transactions` | UUID id PK, user_id FK, quest_id FK, cycle INTEGER, event_type, amount (+/-), created_at, UNIQUE(quest_id,cycle,event_type) |
| `user_progress` | user_id PK, total_xp, level, updated_at, derived cached projection; rebuildable from ledger |

## Sample tables (target Flyway design sketch)
```sql
CREATE TABLE quest_instances (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  habit_id UUID NOT NULL REFERENCES habits(id),
  scheduled_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','COMPLETED','SKIPPED')),
  reward_snapshot INTEGER NOT NULL CHECK (reward_snapshot BETWEEN 0 AND 100),
  category_snapshot VARCHAR(30) NOT NULL,
  completed_at TIMESTAMPTZ,
  cycle INTEGER NOT NULL DEFAULT 0 CHECK (cycle >= 0),
  UNIQUE(user_id, habit_id, scheduled_date)
);
CREATE INDEX idx_quest_user_date ON quest_instances(user_id,scheduled_date);

CREATE TABLE xp_transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  quest_id UUID NOT NULL REFERENCES quest_instances(id),
  cycle INTEGER NOT NULL CHECK(cycle > 0),
  event_type VARCHAR(20) NOT NULL CHECK(event_type IN ('QUEST_COMPLETE','QUEST_REVERT')),
  amount INTEGER NOT NULL CHECK(amount <> 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(quest_id,cycle,event_type)
);
```
`CREATE TABLE users/habits/goals/...` is intentionally deferred; an agent must author full migrations and integration tests in the appropriate ticket, not copy incomplete snippets into production.

## Integrity design
- User ownership: FK chain AND service-level authorization; do not trust user ID supplied by client.
- Goal/habit user ownership check in service layer or composite FK.
- Avoid date overlaps across schedule versions; use PostgreSQL exclusion constraints or transactionally validated intervals.
- Every XP transition runs in a database transaction with quest row lock; update projection in same transaction.
- Quest instance snapshots protect past reward/category from edits.
- Never delete XP transaction history on undo.
- Apply schedule changes effective tomorrow; current day's already-created instance stays unchanged.
- Backup/restore required before production rollout.

## Queries to plan
- Today by user/date with scheduled habit instances.
- Completed vs planned counts by date and goal category.
- XP aggregate by user's local quest date; not event UTC date.
- Current streak by reading historic effective schedules and completions (optimized cache only after correctness).
