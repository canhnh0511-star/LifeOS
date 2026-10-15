# Prompt to hand off Life OS to a coding agent

Read the repository-level `AGENTS.md` FIRST. Then read, in order:
1. `docs/PRD.md` and `docs/UI_SPEC.md`
2. `docs/API_CONTRACT.md`, `docs/openapi.yaml` and `frontend/src/api/types.ts`
3. `docs/DOMAIN_RULES.md` and `docs/DATA_MODEL.md`
4. `docs/TEST_PLAN.md`
5. The selected ticket from `docs/tickets/`

**Current phase:** UI review, ticket `00_FRONTEND_REVIEW.md`. DO NOT implement backend until owner explicitly approves the UI.

Start by running `cd frontend && npm install && npm run test && npm run build && npm run dev`. If npm is unavailable, the dependency-free preview in `preview/` may be served with `python -m http.server 4173`. Verify actual commands/results honestly.

Implement exactly one ticket/vertical slice at a time. State assumptions, modify minimal code, add tests, self-review API parity and XP/Streak race conditions, then summarize changed files, tests executed, risks, and next action. Never deploy or run destructive SQL without explicit approval.
