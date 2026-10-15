# B-04 — Completion & XP Ledger Slice

Goal: PUT/DELETE completion are idempotent, transactional, concurrency-safe and update XP projections.

Unique `(questId,cycle,eventType)` XP entry; state transition locking; immutable reward; recompute `progress` and `level` from ledger; protect from future/backdate>7.

Tests REQUIRED: two simultaneous PUTs, repeated PUT, undo repeated, complete-after-undo, rollback on injected DB error, cross-user mutation denied, level threshold boundary. API outputs `xpAwarded` delta of each call.
