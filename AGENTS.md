# Life OS — Instructions for AI Coding Agents

Start with `docs/agent/AGENT_PROMPT.md`. This repository uses **contract-first, frontend-first** development.

## Current milestone: UI-00 ONLY

**Do not implement Spring Boot, PostgreSQL migrations, real authentication, or external APIs until the project owner explicitly approves the frontend UI.**

- Frontend source: `frontend/` (React, TypeScript, Vite PWA).
- Mock backend: `frontend/src/api/mockClient.ts` (localStorage, no real account).
- API contract: `docs/openapi.yaml` and `frontend/src/api/types.ts`. Align BOTH when proposing contract changes.
- Product rules: `docs/DOMAIN_RULES.md`.
- Tickets: `docs/tickets/00_FRONTEND_REVIEW.md`, then `B-01` to `B-06` only after approval.
- Record architectural tradeoffs in `docs/agent/DECISIONS.md`.

## Working agreement

1. Work a single ticket, report scope and exclusions.
2. Verify user-facing actions; do not ship inert controls.
3. Favor automated tests that reproduce bugs before fixes.
4. No hidden XP bonuses, no retroactive changes to schedules, no production secrets in repository.
5. Keep data in the authenticated user's timezone at day-level, instants in UTC.
6. Treat the mock API as simulation, **not** as production authorization, offline sync, or concurrent database.
7. Report completed changes, test commands/results, known gaps, and proposed next step.
