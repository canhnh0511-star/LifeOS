# B-05 — Journey & Streak Slice

Goal: GET `/journeys/current` and `progress.currentStreak` calculate scheduled sessions and journey completion correctly.

Historical schedules/timezone required. Support pause/resume effective dates. Distinguish calendar elapsed from scheduled completion. Tests: Fri/Mon gap, today's pending, pause, missing session, changes effective tomorrow, start/end dates. Resolve open global-streak meaning in DECISIONS.md before implementing.
