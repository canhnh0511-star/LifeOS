# B-01 — Identity & Secure Backend Foundation
**Start only after UI approval.**

Goal: Java 21 Spring Boot backend starts, Flyway initializes Postgres schema for users, GET `/me`, secure auth session, health check; frontend can connect via real adapter without UI redesign.

Acceptance: per-user identity server side; cookies HttpOnly/Secure/SameSite; CSRF; request errors standardized; no localStorage token; integration tests Testcontainers; no production credentials. Decision required: local username/password vs OAuth provider.

Out of scope: quests/XP. Done: backend starts via Docker Compose, auth tests pass, GET `/me` shape matches TypeScript contract.
