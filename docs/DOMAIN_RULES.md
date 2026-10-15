# Domain Rules — Life OS v1

## Time semantics
- Instants stored in UTC `TIMESTAMPTZ`; `scheduledDate` is ISO `YYYY-MM-DD` in user's IANA timezone.
- Default timezone `Asia/Ho_Chi_Minh`; ISO weekday 1=Monday ... 7=Sunday.
- Future completion rejected. Backdating up to 7 calendar days (inclusive) is permitted.
- Server clock is authoritative; never trust browser `today` for real backend.
- A habit can have a quest on date D when `startDate <= D <= endDate?`, schedule version covers D, and life-cycle status on D is active.

## XP model
Default fixed rewards: Easy 20; Medium 35; Medium+ 40; Hard 50; max 100 per scheduled quest. Reward snapshot at first materialized quest; changing habit reward must not rewrite past XP.

- `PUT /quests/{habitId}/dates/{date}/completion`: incomplete -> complete, append `QUEST_COMPLETE` +reward; complete -> complete, no transaction and `xpAwarded=0`.
- `DELETE` on complete -> pending, append `QUEST_REVERT` -reward; pending -> pending, no transaction and `xpAwarded=0`.
- Complete after undo: append a *new* `QUEST_COMPLETE` event with incremented cycle number. Maintain unique event key per `(questId, cycle, eventType)` and idempotent mutation under DB lock.
- Never overwrite ledger events; `SUM(xp_transactions.amount)` yields actual total XP. Reject negative total XP after compensations (this should be impossible under normal transitions).
- Idempotency is required per **resulting state**, including concurrent duplicate requests.
- API `xpAwarded` = delta of *this request*, not historical reward.

## Level formula
```
level(0..399 XP) = 1
level(n XP) = max(1, floor(sqrt(n / 100)))
level_start_xp(level 1) = 0
level_start_xp(L>=2) = 100 * L^2
next_level_xp(L) = 100 * (L+1)^2
```
Examples: 400 XP -> Level 2; 900 -> L3; 1600 -> L4; 2500 -> L5. To get L5 from L4 needs 900 more XP. No hard threshold based on health/job performance.

## Streak: scheduled-session streak
For each habit, use schedule-effective dates, *not* calendar adjacency. Saturday/Sunday off do not break a Monday-Friday schedule. On today's scheduled pending task, retain yesterday's chain until the local day ends. Skip non-scheduled dates; break on first scheduled missed date. Completed dates count 1 each. Current dashboard streak = max per-habit current streak (demo definition), not union of habits.

Examples:
- Mon-Fri habit, Thu+Fri+Mon completed, Tuesday pending today -> streak 3.
- Mon-Fri habit, Thursday missed, Fri+Mon completed, Tuesday pending -> streak 2.
- Daily habit, yesterday missed, today pending -> streak 0.
- A paused day is not a scheduled required session if valid pause event started before it.

**Historical schedule contract**: edits only effective on next local date, immutable historical schedule versions. Pause/resume needs dated lifecycle event history. Real backend must preserve history even if goals/habits are archived now.

## Journey 66 days
`elapsedDays = clamp(today - startDate + 1, 0, durationDays)`. Journey's final date = startDate + durationDays - 1. Show timeline progress (`elapsedDays / durationDays`) separately from effort completion (`completed scheduled quests / scheduled quests to date`). Neither one proves a habit is permanently formed.

## Analytics
For period N=7 or 30 inclusive of today, each day returns `scheduled`, `completed`, `xpEarned` from ledger with matching quest local date. CompletionRate = round(100*sum(completed)/sum(scheduled)), or 0 if no scheduled tasks. Categories use the goal category snapshotted on quest creation to prevent old charts shifting after goal edits.

## Security/invariants for backend
- User cannot mutate another user's goal/habit/quest.
- Unique `(user_id, habit_id, scheduled_date)` quest instance; DB transactions for state+ledger+projection.
- `GET` read-only; no XP granted on GET or from schedule generation alone.
- Prevent race conditions by row-level locking or equivalent conditional transition.
- Do not allow bonus XP outside the ledger or negative XP reward inputs.
