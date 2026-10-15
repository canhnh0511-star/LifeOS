# B-02 — Goals & Habits Vertical Slice

Goal: create/list/update Goals and Habits with real PostgreSQL persistence. Authenticated user owns every record.

Endpoints: GET/POST/PATCH `/goals`; GET/POST/PATCH `/habits`. Validation on title, category, target minutes, weekdays, XP, ownership.

Acceptance: UI modal operations run against backend; persist on refresh; historical effective schedules start today and edits take effect tomorrow; 401/403 cross-user tests. Migration includes goals, habits, schedule version and lifecycle events.
