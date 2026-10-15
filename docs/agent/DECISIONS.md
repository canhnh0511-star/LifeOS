# Architecture Decision Log

| ID | Status | Decision | Reason |
|---|---|---|---|
| ADR-001 | Accepted for frontend | React + TypeScript + Vite PWA | Fast iteration and installable mobile UI |
| ADR-002 | Accepted for frontend | `LifeOsApi` adapter mock / HTTP | UI-first development with fixed contract |
| ADR-003 | Proposed backend | Java 21, Spring Boot modular monolith, PostgreSQL | Familiar stack, simpler operation than services |
| ADR-004 | Accepted for demo | Timezone Asia/Ho_Chi_Minh, ISO local dates | Predictable habit schedule calculation |
| ADR-005 | Accepted for demo | XP event log and idempotent transitions | No accidental double points |
| ADR-006 | Proposed backend | Immutable scheduled quest instances + schedule versions | Historical analytics and XP integrity |
| ADR-007 | Proposed backend | Secure HTTP-only cookie + CSRF token | Avoid localStorage tokens and cookie CSRF pitfalls |
| ADR-008 | Open | Provider of credentials (local password vs OAuth) | Decide before B-01 |
| ADR-009 | Open | Meaning of global Streak: best habit vs all scheduled days | Demo shows max per-habit streak |
| ADR-010 | Accepted for demo | Paused goals hide linked quests; separate habit pause persists | Avoid completing quests for an inactive goal. Mock history is not immutable yet |

Changes to Accepted decisions require explicit discussion before contract-breaking work.
