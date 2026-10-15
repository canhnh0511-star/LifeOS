# Life OS backend

Java 21, Spring Boot 4, PostgreSQL (Flyway). Package-by-feature; each feature uses the same layers.

```
src/main/java/app/lifeos/
  LifeOsApplication
  config/                  cross-cutting wiring (SecurityConfig: session cookie, CSRF, 401/403 bodies)
  common/
    error/                 ApiException, ApiError, ApiExceptionHandler  -> {code,message,fields,requestId}
    logging/               RequestLoggingFilter, MdcUserFilter, LogContext
  <feature>/               identity today; goals, habits, quests... follow the same shape
    controller/            HTTP only: validate, call service, map to DTO
    service/               business rules, transactions, audit logging
    repository/            Spring Data interfaces
    model/                 JPA entities
    dto/                   request/response records that mirror docs/openapi.yaml
src/main/resources/
  application.yml          all settings; secrets only via environment variables
  db/migration/            Flyway, V<n>__<what>.sql, never edited after merge
src/test/java/             mirrors main; integration tests go over real HTTP + real PostgreSQL
```

Rules: controllers never touch repositories of other features; a DTO change must update `docs/openapi.yaml` and `frontend/src/api/types.ts` in the same change.

## Run

- Tests: `./mvnw test` (Testcontainers when Docker exists, otherwise an embedded PostgreSQL).
- No Docker: `./mvnw spring-boot:test-run -Dspring-boot.run.main-class=app.lifeos.DevServer`, then `VITE_API_MODE=real npm run dev` in `frontend/`.
- Docker: copy `.env.example` to `.env`, then `docker compose up --build` from the repo root.

## Logging and tracing

Every line: `time LEVEL [requestId] [u=userId] logger : message`.

- `requestId`: taken from a safe `X-Request-Id` request header or generated; returned in the `X-Request-Id` response header and in every error body. Quote it to find all lines of one request.
- One access line per request (`logger app.lifeos.http`): `http method= path= status= durationMs= user= ip=`. Health checks are DEBUG. Status 5xx is WARN. Query strings, headers, cookies and bodies are never logged.
- Audit events, message prefix `auth.`: `register.created`, `register.rejected`, `login.failed reason=unknown_email|bad_password`, `signed_in`, `logout`, `csrf.rejected`, `session.orphaned`. Emails appear only as a short SHA-256 fingerprint, so the same address can be correlated without storing it in logs. Passwords, session ids and CSRF tokens are never logged.
- Rejections (`request.rejected status= code= fields=`) log field names, not submitted values. Unexpected errors (`request.failed status=500`) log the stack trace once, server side only; clients get a generic message plus `requestId`.
- Env: `LIFEOS_LOG_LEVEL` (default INFO; DEBUG adds anonymous 401s and health checks), `LOGGING_FILE_NAME` (also write a rolled file, 20 MB x 14 days). Behind a reverse proxy, `ip=` is the proxy address until `server.forward-headers-strategy` is configured.
