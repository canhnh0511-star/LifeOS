> **SUPERSEDED** — lưu trữ, không còn là yêu cầu. Xem `docs/archive/SUPERSEDED.md` và `docs/PRODUCT_V1.md`.

# 01 — Nền tảng: ledger có cycle, lịch sử bất biến khi pause, ApiError thống nhất

Status: resolved (frontend mock + httpClient + docs; chưa commit)
Type: task
Blocks: `.scratch/rpg-campaign/` (boss, achievement, area stats)

## Phạm vi (chỉ frontend: mock + httpClient + docs; không backend)
1. **Ledger bất biến có cycle**: `QuestState{cycle}` + `XpEvent{cycle,category}`; undo không xóa lịch sử; hoàn thành lại ghi event ở cycle mới; hoàn tác trả đúng số XP đã snapshot. Habit `xpReward=0` đổi được trạng thái nhưng không ghi event.
2. **Lịch sử không bị viết lại**: pause/resume goal và habit ghi lifecycle event, **có hiệu lực từ ngày local kế tiếp**. Một hàm duy nhất quyết định quest hợp lệ vào ngày D dùng chung cho danh sách quest, PUT/DELETE, streak, journey, analytics, earned XP (sửa A1–A3).
3. **ApiError thống nhất** cho mock và httpClient (`status`, `code`, `message`, `fields`); validate đầy đủ input mock; httpClient parse lỗi, 204, 401, timeout, sửa thứ tự `headers`/`init` (sửa A4, A6–A8, A10).

## Giá trị mặc định đã chọn (chưa được owner xác nhận riêng)
- Cửa sổ sửa: hôm nay và lùi tới 7 ngày (giữ hành vi mock hiện tại).
- Goal pause hành xử như habit pause: ngày pause không bị coi là bỏ lỡ.
- Mã lỗi: 404 `NOT_FOUND`; 422 `VALIDATION_FAILED`, `QUEST_IN_FUTURE`, `QUEST_TOO_OLD`, `QUEST_OUTSIDE_SCHEDULE`; 409 `QUEST_NOT_ACTIVE`; 401 `UNAUTHENTICATED`.
- `streak` trong QuestMutation vẫn là streak của habit đó (ADR-009 còn mở).

## Ngoài phạm vi
Area stats, boss, achievement, tách App.tsx, đổi bản `preview/`, xác thực/CSRF (B-01).

## Cách kiểm chứng
`npm test`, `tsc -b`, `npm run build` trong bản sao; test mới tái hiện từng lỗi trước khi sửa.

## Kết quả
- `mockClient.ts` viết lại: `QuestState{cycle}`, ledger append-only có `cycle` và `category`, lifecycle event hiệu lực từ ngày mai, `isQuestOn` dùng chung, validate đầy đủ, migrate v1 -> v2.
- `errors.ts` (`ApiError`, `ErrorCode`), `httpClient.ts` parse lỗi / 204 / 401 / timeout, header không còn bị ghi đè.
- `rules.ts`: streak nhận predicate `isRequired` để bỏ qua ngày pause.
- Test: 44 test đạt (trước 8); `tsc -b` và `npm run build` sạch trong bản sao.
- Docs: bảng mã lỗi và quy tắc pause trong API_CONTRACT, openapi (404/409/422), ADR-018/019, UI_SPEC bước 5.

## Còn lại / ghi nhận
- `streak` trong QuestMutation vẫn là streak của habit (ADR-009 mở).
- `preview/` vẫn dùng engine cũ (FE-6).
- Mock lưu `status` là trạng thái được yêu cầu gần nhất; UI hiển thị ngay dù hiệu lực từ ngày mai.
