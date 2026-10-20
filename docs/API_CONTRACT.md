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
| PATCH | `/habits/{id}` | partial `title`,`targetMinutes`,`xpReward`,`weekdays`,`endDate`,`status`,`objectives` | `HabitDto` |
| POST | `/imports/habit-plans` | `ImportHabitPlanRequest` | `ImportedHabitPlanDto` (201; atomic; ≤ 10 goal, ≤ 50 habit; 409 `PLAN_ALREADY_IMPORTED`) |
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

`xpAwarded` là delta ròng của cả request (gồm các thay đổi phụ); `effects[]` liệt kê từng thay đổi phụ (`BOSS_REVERTED`, `ACHIEVEMENT_GRANTED`, `ACHIEVEMENT_REVOKED`).

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
Định dạng: `{"code":"QUEST_OUTSIDE_SCHEDULE","message":"Ngày không thuộc lịch thói quen.","fields":{},"requestId":"…"}`. `requestId` (backend thật) trùng header `X-Request-Id`; client có thể gửi `X-Request-Id` riêng (8–64 ký tự `A-Za-z0-9._-`) để nối log hai phía.
HTTP status chuẩn: 400 validation, 401 chưa xác thực, 403 không có quyền, 404 không tìm thấy, 409 xung đột trạng thái, 422 domain validation, 429 rate limit, 500 lỗi không mong đợi. Không bao giờ trả raw exception hay stack trace.

### Bảng mã lỗi (mock và backend phải khớp)
| HTTP | `code` | Khi nào |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Chưa đăng nhập hoặc session hết hạn |
| 401 | `INVALID_CREDENTIALS` | Đăng nhập sai; email không tồn tại và sai mật khẩu trả về y hệt nhau |
| 429 | `RATE_LIMITED` | Quá nhiều lần `POST /auth/login` hoặc `/auth/register` theo IP hoặc theo email (cửa sổ trượt: login 15 phút, register 1 giờ). Kèm header `Retry-After` (giây). Khi đã khoá, mật khẩu đúng cũng bị từ chối; email tồn tại hay không trả về y hệt nhau |
| 403 | `CSRF_INVALID` | Mutation thiếu hoặc sai header `X-XSRF-TOKEN` |
| 409 | `PLAN_NOT_STARTED` | `POST /plan/recovery`: tài khoản chưa có giáo án; không tạo gì |
| 409 | `PLAN_ALREADY_IMPORTED` | `POST /imports/habit-plans`: đã có goal ACTIVE cùng tên (không phân biệt hoa/thường), hoặc kế hoạch lặp tên goal; không tạo gì |
| 409 | `EMAIL_TAKEN` | Email đã đăng ký (không phân biệt hoa/thường) |
| 400 | `BAD_REQUEST` | JSON không đọc được |
| 500 | `INTERNAL_ERROR` | Lỗi không mong đợi; không lộ chi tiết |
| 404 | `NOT_FOUND` | Không tìm thấy hoặc không thuộc về user |
| 422 | `VALIDATION_FAILED` | Input sai; `fields` liệt kê từng field kèm thông báo (gồm cả ngày sai định dạng, patch rỗng hoặc có field không cho phép) |
| 422 | `QUEST_IN_FUTURE` | Hoàn thành/hoàn tác quest của ngày tương lai |
| 422 | `QUEST_TOO_OLD` | Quest cũ hơn 7 ngày so với hôm nay (hôm nay và lùi 7 ngày vẫn được); với boss: undo boss đã hạ quá 7 ngày |
| 422 | `QUEST_OUTSIDE_SCHEDULE` | Ngày không thuộc weekday hoặc khoảng ngày của habit |
| 409 | `QUEST_NOT_ACTIVE` | Habit hoặc goal đang tạm dừng vào ngày đó |
| 409 | `BOSS_LOCKED` | Level lĩnh vực của boss chưa đạt `requiredLevel` |

Chỉ có `HTTP_ERROR`, `NETWORK_ERROR`, `REQUEST_TIMEOUT` (status 0) là mã phía client, khi không có response hợp lệ từ server.

### Sửa habit (B-10)
`weekdays` mới tạo một phiên bản lịch hiệu lực từ ngày local kế tiếp (đổi hai lần trong một ngày thì lần sau thay lần trước; lịch không đổi thì không tạo phiên bản). `xpReward` mới chỉ áp dụng từ ngày kế tiếp; quest của các ngày đã sống (hôm nay và cửa sổ sửa 7 ngày) giữ reward cũ. `title`, `targetMinutes` áp dụng ngay. `endDate` là hôm nay trở đi hoặc `null`; thói quen đã kết thúc thì không đổi được `endDate`. `status: ARCHIVED` có hiệu lực từ ngày kế tiếp và là cuối cùng: habit đã lưu trữ không sửa, không kích hoạt lại được (422 trên `patch`).

### Nhiệm vụ có danh sách mục tiêu (B-17)
Habit có thể có `objectives[]` (`title`, `target` 1..10000, `unit` tự do ≤ 20 ký tự, `step` 1..target). `target 1` không đơn vị là mục tick. Quest chụp danh sách này khi được tạo (giống `xpReward`); sửa danh sách chỉ áp dụng từ ngày mai. `PUT /quests/{habitId}/dates/{date}/objectives/{objectiveId}` với `{value}` đặt tiến độ tuyệt đối (idempotent); khi mọi mục `value >= target` quest tự hoàn thành (một `QUEST_COMPLETE`, XP không đổi) và tự hoàn tác khi một mục tụt dưới mục tiêu. `PUT/DELETE .../completion` vẫn chạy: đặt mọi mục bằng mục tiêu / về 0. Habit không có mục giữ nguyên một nút tick.

### Rương hằng ngày và chuỗi ngày (B-19, ADR-033)
`GET /dashboard/today` (cả `?date=`) trả thêm `dailyRewards[]` (`tier` WOOD/SILVER/GOLD, `threshold` = số nhiệm vụ cần xong, `xp` 10/20/40, `state` LOCKED/EARNED; rỗng nếu ngày không có nhiệm vụ) và `dayStreak`. Mốc = 50%/80%/100% số nhiệm vụ đã lên lịch, làm tròn lên; ngày có dưới 3 nhiệm vụ không có rương (`dailyRewards` rỗng). Hoàn thành/hoàn tác nhiệm vụ cấp hoặc thu hồi rương trong cùng transaction; `QuestMutation.effects` có `DAILY_REWARD_GRANTED/REVOKED` (`code` = tier) và XP đã nằm trong `xpAwarded`.

### Vật phẩm rơi từ rương (B-22, ADR-034)
`GET /items` trả cả danh mục kèm `owned`/`equipped`/`acquiredDate`; `PUT|DELETE /items/{code}/equipped` đeo/tháo (đeo thay món đang đeo cùng ô; 404 nếu chưa sở hữu). Mỗi rương mở rơi tối đa một món, không trùng món đã có; rương bị thu hồi thì món đó mất và bị tháo. `dailyRewards[].itemCode` cho biết rương đã rơi món nào; `effects[]` có `ITEM_DROPPED`/`ITEM_REVOKED` (`code` = mã món, `xpDelta` = 0). Vật phẩm không cộng XP.

### Số đo cơ thể (B-24, ADR-035)
`GET /metrics` trả các chỉ số kèm giá trị theo ngày (cũ → mới); lần đọc đầu tạo 3 chỉ số mặc định (Cân nặng kg, Vòng eo cm, Mỡ cơ thể %). `POST /metrics` thêm chỉ số riêng (tên 1–40 ký tự, không trùng không phân biệt hoa thường, đơn vị ≤ 12, tối đa 20). `PUT /metrics/{id}/entries/{date}` ghi giá trị của một ngày (ghi lại cùng ngày thì thay thế; không ở tương lai, tối đa 366 ngày trước; giá trị > 0 và ≤ 100000, làm tròn 2 chữ số). `DELETE .../entries/{date}` xoá giá trị của ngày; `DELETE /metrics/{id}` xoá chỉ số riêng (mặc định → 409). Số đo **không** cộng XP, không vào ledger, streak hay rương.

### Pause/resume và hiệu lực
`PATCH /goals/{id}` và `PATCH /habits/{id}` đổi `status` có hiệu lực từ **ngày local kế tiếp**. Response trả `status` mới được yêu cầu. Các ngày đã qua và ngày hôm nay không bị thay đổi: quest, analytics, journey và streak của chúng giữ nguyên. Ngày bị pause không phải session bắt buộc nên không làm đứt streak.

## Chuyển từ mock sang API thật
- `frontend/src/api/client.ts` = interface duy nhất.
- `frontend/src/api/mockClient.ts` = bản triển khai localStorage.
- `frontend/src/api/httpClient.ts` = bản triển khai fetch.
- `VITE_API_MODE=real` chuyển adapter tại thời điểm build.
- API contract test phải so sánh mock với backend trên các ngày fixture đã biết.
- Auth (ADR-008): `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /me`. Cookie phiên `LIFEOS_SESSION` (HttpOnly, Secure, SameSite=Lax); CSRF double-submit: mọi response (kể cả 401) đặt cookie `XSRF-TOKEN`, mutation phải gửi lại giá trị đó qua header `X-XSRF-TOKEN`. Không lưu token trong localStorage. Mật khẩu 10–72 ký tự. Chế độ real của frontend hiển thị màn hình đăng nhập/đăng ký tối giản khi `getMe` trả 401.

## Nhật ký set (B-34, ADR-037)
`GET /quests/{habitId}/dates/{date}/sets` trả các set đã ghi của buổi tập (theo bài rồi số set; đọc được cả ngày cũ). `PUT` cùng đường dẫn ghi một set `{exercise, setNo, reps, weightKg?}`: idempotent theo (bài tập không phân biệt hoa thường, setNo), ghi lại thì thay thế; chỉ cho ngày thói quen có lịch, từ hôm nay lùi 7 ngày (`QUEST_IN_FUTURE`, `QUEST_TOO_OLD`, `QUEST_OUTSIDE_SCHEDULE` như hoàn thành nhiệm vụ); `exercise` 1–100 ký tự, `setNo` 1–50, `reps` nguyên 1–1000 (giây với bài giữ như Plank), `weightKg` 0–1000 hoặc null, làm tròn 2 chữ số; tối đa 300 set mỗi buổi. `DELETE ...?exercise=&setNo=` xoá một set (không có thì không lỗi). Cả hai trả danh sách set sau thay đổi. `GET /workout-sets/last?exercise=&before=` trả `{date, sets}` của lần gần nhất trước ngày `before` trên bất kỳ buổi nào (`date: null` nếu chưa từng). Nhật ký set **không** cộng XP, không vào ledger, streak hay rương và không tự hoàn thành nhiệm vụ.

## Huy hiệu tập luyện và thống kê set (B-29, B-41, ADR-038)
`GET /badges` trả `[{code, name, description, earned, progress, target}]` cho `BADGE_FIRST_WORKOUT`, `BADGE_10_SESSIONS` (buổi đã hoàn thành có danh sách bài) và `BADGE_100_SETS` (set đã ghi). Tính lại mỗi lần đọc, không lưu, không XP. `GET /workout-stats?days=7` (1–90, mặc định 7) trả `{from, to, sessions, days:[{date, sets}], exercises:[{exercise, sets, reps, volumeKg}]}`, bài nặng nhất trước. `days` sai (0, 91, chữ) trả 422 với trường `days`. Cả hai chỉ đọc dữ liệu của người đang đăng nhập.
