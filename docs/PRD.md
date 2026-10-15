# Life OS — PRD v1.0

## Product goal
Single-user-first PWA to convert long-term goals into scheduled, measurable daily actions. Motivation through experience points and a 66-day journey, with analytics that distinguish effort from merely passing days.

## Personas and context
Primary user: developer who learns Java/AI, practices piano, reads, and exercises. Uses laptop during work and iPhone throughout the day. UI defaults to Vietnamese with a few English RPG labels. Timezone: `Asia/Ho_Chi_Minh`.

## MVP product scope
| ID | Requirement | Acceptance |
|---|---|---|
| F01 | Personal account | Auth context always maps mutations to one user; demo uses mock identity |
| F02 | Goals | Create / list / pause / resume, categorized by life area |
| F03 | Habits | Attach to goal, schedule ISO weekdays, duration, XP reward |
| F04 | Daily quests | Generate scheduled tasks for a selected local date |
| F05 | Completion | Idempotent complete / undo; cannot complete future, allow 7-day backdate |
| F06 | Gamification | XP ledger, calculated level, current per-habit scheduled streak |
| F07 | Journey | Show elapsed days and separately the completion ratio |
| F08 | Analytics | Last 7/30 daily counts, XP earned, categories |
| F09 | PWA | Installable manifest, responsive, app shell cache, HTTPS in production |

## Exclusions
AI Coach, native mobile, social leaderboard, payments, push, offline mutation queue, arbitrary schedule revisions, Apple Health integrations, achievements, multi-tenant enterprise accounts.

## Screen acceptance
- Today: selected day, level bar, XP, scheduled quests, progress, streak, weekly activity.
- Journey: goal cards with associated habits, create goal and habit, pause/resume, dual 66-day metrics.
- Insights: 7/30-day chart, category completion, XP total, reflection hint.
- Settings: mock reset/export and mode awareness.

## UX behaviors
- All primary actions are buttons with loading/error feedback.
- Never display XP gain twice for the same completion; undo gives negative compensating XP.
- Today's incomplete quest does not prematurely break streak; non-scheduled weekend cannot break a weekday streak.
- Changing a tab does not discard saved data.
- Do not treat journey elapsed time as achievement.

## Non-functional targets (targets, not verified metrics)
- Responsive width 320px–1440px, keyboard navigable, touch-friendly.
- API p95 goal <500 ms on ordinary personal-sized data (requires real backend load test).
- Backend persistent state under atomic transaction, per-user authorization, backups, restore drill.
- Production authentication, HTTPS, secure cookie configuration, CORS policy.

## Release gate
Human review UI and flows before backend implementation. User feedback can change fields/status rules; update API contract and tickets before coding backend.
