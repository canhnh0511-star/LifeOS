# Agent workflow — Spec → Ticket → Implement → Review

## Stage A: Frontend review (CURRENT)
1. Read PRD + UI_SPEC + API_CONTRACT.
2. Run `cd frontend && npm install && npm run dev`.
3. Visually inspect Today/Journey/Insights on desktop and iPhone.
4. Test interactions and note screenshots/feedback in a UI approval checklist.
5. Modify frontend only; keep `LifeOsApi` type contract.
6. Run build/tests and explain limitations.
7. Ask for **explicit UI approval** before starting Stage B.

## Stage B: Backend vertical slices (AFTER APPROVAL)
Process tickets sequentially. One ticket/PR each. First make API contract tests pass against mock fixture data, then implement route/service/repository/migration/integration test. No deployment/migration on existing database without explicit approval. Prefer feature packages (modular monolith), avoid microservices.

### Recommended prompt for Codex/Claude Code
```
You are implementing Life OS. Read AGENTS.md, docs/PRD.md,
docs/API_CONTRACT.md, docs/DOMAIN_RULES.md, docs/DATA_MODEL.md,
and the selected docs/tickets/B-XX.md.

FIRST: summarize exact acceptance criteria and any unresolved decisions.
Do not implement unrelated features. Preserve frontend UI and existing DTO shapes.
Implement one vertical slice at a time, with unit and integration tests.
Never run destructive operations against an external database or deploy.
Report changed files, tests actually executed, and unresolved risks.
```

## Artifacts required from an agent
- Brief ticket implementation plan and assumptions.
- Compilable code; updated tests.
- Database migration only for relevant ticket after stage B begins.
- Contract examples and documented errors.
- Self-review (including concurrency/timezone/ownership when relevant).
- Handoff summary, no unverified completion claims.
