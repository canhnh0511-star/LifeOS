# Life OS — API Contract v1

Source DTOs: `frontend/src/api/types.ts`. Machine-readable OpenAPI 3.1: [`docs/openapi.yaml`](openapi.yaml). Base URL `/api/v1`. All JSON camelCase. Local dates `YYYY-MM-DD`; instants UTC ISO 8601. IDs UUID on real backend (seeded demo uses human-readable IDs). Auth from secure HTTP-only same-site cookie after B-01; `credentials: include`. CSRF protection required for cookie-backed writes. This contract is stable only after UI sign-off.

## Endpoints
| Verb | Path | Request | Response |
|---|---|---|---|
| GET | `/me` | — | `UserDto` |
| GET | `/dashboard/today?date=YYYY-MM-DD` | date optional (default today) | `DailyDashboardDto` |
| GET | `/goals` | — | `GoalDto[]` |
| POST | `/goals` | `CreateGoalRequest` | `GoalDto` (201) |
| PATCH | `/goals/{id}` | partial `title`,`description`,`status` | `GoalDto` |
| GET | `/habits` | — | `HabitDto[]` |
| POST | `/habits` | `CreateHabitRequest` | `HabitDto` (201) |
| PATCH | `/habits/{id}` | partial `status` | `HabitDto` |
| GET | `/quests?date=YYYY-MM-DD` | required date | `QuestDto[]` |
| PUT | `/quests/{habitId}/dates/{date}/completion` | empty | `QuestMutationDto` |
| DELETE | `/quests/{habitId}/dates/{date}/completion` | empty | `QuestMutationDto` |
| GET | `/progress` | — | `ProgressDto` |
| GET | `/analytics/weekly` | — | `AnalyticsDto` period 7d |
| GET | `/analytics/monthly` | — | `AnalyticsDto` period 30d |
| GET | `/journeys/current` | — | `JourneyDto | null` |

## DTO examples
### `GET /dashboard/today?date=2026-10-13`
```json
{
  "date": "2026-10-13",
  "user": {"id":"e02c8f40-6fc0-425f-8ebd-0ea6bbd0e77b","displayName":"Demo User","email":"demo@example.com","timezone":"Asia/Ho_Chi_Minh"},
  "quests": [{
    "habitId":"af7198b8-3686-45e3-a92f-6b1cd8809c73",
    "goalId":"7980c2bc-807e-4466-8d9c-d7c624e5a81e",
    "goalTitle":"Improve engineering skills","title":"Deep work · Java & AI",
    "targetMinutes":45,"xpReward":50,"category":"CAREER",
    "date":"2026-10-13","status":"PENDING","completedAt":null
  }],
  "progress":{"totalXp":1850,"level":4,"levelStartXp":1600,"nextLevelXp":2500,"currentStreak":3,"longestStreak":3},
  "completedCount":0,"scheduledCount":1,"earnedXpToday":0,
  "journey":{"id":"47f7f0ea-8bce-4f12-8f90-ea82b9e6b730","title":"The 66-Day Reset","startDate":"2026-09-23","durationDays":66,"elapsedDays":21,"totalScheduledToDate":64,"completedToDate":48,"status":"ACTIVE"}
}
```

### `POST /goals`
```json
{"title":"Play piano","description":"Đệm hát tốt hơn","category":"CREATIVITY"}
```

### `POST /habits`
```json
{"title":"Practice piano","goalId":"7980c2bc-807e-4466-8d9c-d7c624e5a81e","targetMinutes":30,"xpReward":35,"weekdays":[1,2,3,4,5,6,7],"startDate":"2026-10-13"}
```

### PUT/DELETE completion response
```json
{"habitId":"af7198b8-3686-45e3-a92f-6b1cd8809c73","date":"2026-10-13","status":"COMPLETED","xpAwarded":50,"totalXp":1900,"level":4,"streak":4}
```
For repeated PUT, same `status` but `xpAwarded: 0`. On DELETE first time: `status: PENDING`, `xpAwarded: -50`. Second DELETE: `xpAwarded: 0`. Returning to PUT after DELETE awards +50 in a *new* ledger cycle.

### `GET /analytics/weekly`
```json
{"period":"7d","days":[{"date":"2026-10-13","scheduled":3,"completed":2,"xpEarned":70}],"scheduledCount":3,"completedCount":2,"completionRate":67,"earnedXp":70,"categories":[{"category":"CAREER","scheduled":1,"completed":1}]}
```
`days` array must have exactly 7 ordered dates in production (example truncated). Monthly: 30.

## Enums
- `GoalCategory`: `CAREER`, `CREATIVITY`, `HEALTH`, `KNOWLEDGE`, `MINDFULNESS`
- `RecordStatus`: `ACTIVE`, `PAUSED`, `ARCHIVED`
- `QuestStatus`: `PENDING`, `COMPLETED`, `SKIPPED` (SKIPPED reserved; UI does not yet implement)
- Weekdays 1 through 7 (ISO).

## Errors
Format: `{"code":"QUEST_OUTSIDE_SCHEDULE","message":"Ngày không thuộc lịch thói quen.","fields":{}}`.
Standard HTTP codes: 400 validation, 401 unauthenticated, 403 unauthorized, 404 not found, 409 state conflict, 422 domain validation, 429 rate limit, 500 unexpected. Never include raw exception/stack trace.

## Migration from mock to real API
- `frontend/src/api/client.ts` = one interface.
- `frontend/src/api/mockClient.ts` = localStorage implementation.
- `frontend/src/api/httpClient.ts` = fetch implementation.
- `VITE_API_MODE=real` switches adapter at build time.
- API contract tests must compare mock and backend for known fixture dates.
- Existing frontend does not implement login screen/CSRF header; create these in B-01 before release.
