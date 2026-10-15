# Life OS — API Contract v1

DTO nguồn: `frontend/src/api/types.ts`. OpenAPI 3.1 dạng máy đọc được: [`docs/openapi.yaml`](openapi.yaml). Base URL `/api/v1`. Toàn bộ JSON dùng camelCase. Local date theo `YYYY-MM-DD`; instant theo UTC ISO 8601. ID là UUID trên backend thật (demo seed dùng ID dễ đọc). Auth qua cookie HTTP-only, same-site, bảo mật, sau B-01; dùng `credentials: include`. Bắt buộc có bảo vệ CSRF cho các thao tác ghi dùng cookie. Contract này chỉ ổn định sau khi UI được duyệt.

## Endpoint
| Verb | Path | Request | Response |
|---|---|---|---|
| GET | `/me` | — | `UserDto` |
| GET | `/dashboard/today?date=YYYY-MM-DD` | date tùy chọn (mặc định là hôm nay) | `DailyDashboardDto` |
| GET | `/goals` | — | `GoalDto[]` |
| POST | `/goals` | `CreateGoalRequest` | `GoalDto` (201) |
| PATCH | `/goals/{id}` | partial `title`,`description`,`status` | `GoalDto` |
| GET | `/habits` | — | `HabitDto[]` |
| POST | `/habits` | `CreateHabitRequest` | `HabitDto` (201) |
| PATCH | `/habits/{id}` | partial `status` | `HabitDto` |
| GET | `/quests?date=YYYY-MM-DD` | bắt buộc có date | `QuestDto[]` |
| PUT | `/quests/{habitId}/dates/{date}/completion` | rỗng | `QuestMutationDto` |
| DELETE | `/quests/{habitId}/dates/{date}/completion` | rỗng | `QuestMutationDto` |
| GET | `/progress` | — | `ProgressDto` |
| GET | `/analytics/weekly` | — | `AnalyticsDto` period 7d |
| GET | `/analytics/monthly` | — | `AnalyticsDto` period 30d |
| GET | `/journeys/current` | — | `JourneyDto | null` |

### Endpoint của lớp RPG (kế hoạch; chưa có trong mock)
Spec: `.scratch/rpg-campaign/spec.md`. Các field mới trên DTO hiện có (`ProgressDto.areas`, `JourneyDto.chapters`, `AnalyticsDto.previous`, `QuestMutationDto.effects`) đang **tùy chọn** trong `types.ts` và OpenAPI; chuyển thành bắt buộc khi mock/backend triển khai.
| Verb | Path | Request | Response |
|---|---|---|---|
| PUT | `/bosses/{bossId}/completion` | rỗng | `BossMutationDto` (409 `BOSS_LOCKED` nếu boss chưa mở khóa) |
| DELETE | `/bosses/{bossId}/completion` | rỗng | `BossMutationDto` (hoàn tác, thu hồi thưởng) |
| GET | `/achievements` | — | `AchievementDto[]` (campaign hiện tại) |

`xpAwarded` là delta ròng của cả request (gồm các thay đổi phụ); `effects[]` liệt kê từng thay đổi phụ (`BOSS_REVERTED`, `ACHIEVEMENT_GRANTED`, `ACHIEVEMENT_REVOKED`). Mã HTTP của `BOSS_LOCKED` là tạm thời (409) và sẽ thống nhất trong bảng mã lỗi ở bước chốt contract.

## Ví dụ DTO
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

### Response của PUT/DELETE completion
```json
{"habitId":"af7198b8-3686-45e3-a92f-6b1cd8809c73","date":"2026-10-13","status":"COMPLETED","xpAwarded":50,"totalXp":1900,"level":4,"streak":4}
```
Với PUT lặp lại: `status` giữ nguyên nhưng `xpAwarded: 0`. Với DELETE lần đầu: `status: PENDING`, `xpAwarded: -50`. DELETE lần hai: `xpAwarded: 0`. PUT lại sau DELETE cộng +50 trong một chu kỳ ledger *mới*.

### `GET /analytics/weekly`
```json
{"period":"7d","days":[{"date":"2026-10-13","scheduled":3,"completed":2,"xpEarned":70}],"scheduledCount":3,"completedCount":2,"completionRate":67,"earnedXp":70,"categories":[{"category":"CAREER","scheduled":1,"completed":1}]}
```
Mảng `days` phải có đúng 7 ngày theo thứ tự trên production (ví dụ đã rút gọn). Monthly: 30 ngày.

## Enum
- `GoalCategory`: `CAREER`, `CREATIVITY`, `HEALTH`, `KNOWLEDGE`, `MINDFULNESS`
- `RecordStatus`: `ACTIVE`, `PAUSED`, `ARCHIVED`
- `QuestStatus`: `PENDING`, `COMPLETED`, `SKIPPED` (SKIPPED được dành riêng; UI chưa triển khai)
- Weekday từ 1 đến 7 (ISO).

## Lỗi
Định dạng: `{"code":"QUEST_OUTSIDE_SCHEDULE","message":"Ngày không thuộc lịch thói quen.","fields":{}}`.
HTTP status chuẩn: 400 validation, 401 chưa xác thực, 403 không có quyền, 404 không tìm thấy, 409 xung đột trạng thái, 422 domain validation, 429 rate limit, 500 lỗi không mong đợi. Không bao giờ trả raw exception hay stack trace.

## Chuyển từ mock sang API thật
- `frontend/src/api/client.ts` = interface duy nhất.
- `frontend/src/api/mockClient.ts` = bản triển khai localStorage.
- `frontend/src/api/httpClient.ts` = bản triển khai fetch.
- `VITE_API_MODE=real` chuyển adapter tại thời điểm build.
- API contract test phải so sánh mock với backend trên các ngày fixture đã biết.
- Frontend hiện tại chưa có màn hình login hay CSRF header; phải tạo trong B-01 trước khi release.
