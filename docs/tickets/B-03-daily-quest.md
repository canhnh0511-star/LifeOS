# B-03 — Daily Quest Slice

Goal: GET `/quests?date=...` and GET `/dashboard/today?date=...` produce correct persisted snapshot data for ISO user-local date.

Implement `quest_instances` with unique user/habit/date, snapshot XP and category; schedule history effective-date logic; no XP on GET; preserve past when habit paused or edited. Tests: weekly off, weekend, leap year, timezone boundary, status changes. Dashboard can initially return `progress` from placeholder/ledger query until B-04.
