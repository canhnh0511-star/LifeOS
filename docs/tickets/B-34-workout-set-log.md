# B-34 — Nhật ký từng set/rep/mức tạ

Trạng thái: **xong** (2026-10-17) · Backend + contract + frontend · ADR-037 · Owner duyệt thiết kế; tên bài tập chọn từ thư viện B-32.

## Đã làm
- Backend: migration `V12__workout_sets.sql` (bảng `workout_sets`, duy nhất theo user + habit + ngày + bài tập không phân biệt hoa thường + số set), `WorkoutSet`, `WorkoutSetRepository`, `WorkoutSetService`, 4 endpoint trong `QuestController`:
  `GET/PUT/DELETE /quests/{habitId}/dates/{date}/sets` và `GET /workout-sets/last?exercise=&before=`.
- Luật: ghi idempotent theo (bài, số set), có khoá advisory theo user nên ghi song song cùng một set chỉ để lại một dòng; chỉ ghi cho ngày thói quen có lịch, từ hôm nay lùi 7 ngày (cùng mã lỗi `QUEST_IN_FUTURE`/`QUEST_TOO_OLD`/`QUEST_OUTSIDE_SCHEDULE` như hoàn thành nhiệm vụ); đọc được mọi ngày; cô lập theo user (404 với thói quen của người khác); `reps` nguyên 1–1000 (giây với Plank), `setNo` 1–50, `weightKg` 0–1000 hoặc null, tối đa 300 set mỗi buổi; kiểu sai (chữ, số lẻ, null, true) là lỗi trường 422.
- **Không XP, không ledger, không streak/rương, không tự hoàn thành quest** (có test đối chiếu số dòng ledger và trạng thái quest).
- "Lần trước" tìm theo người dùng trên mọi buổi (cùng bài ở buổi A và C dùng chung lịch sử), không theo từng habit — khác đề xuất ban đầu `GET /habits/{id}/sets/last`.
- Contract: `docs/openapi.yaml`, `docs/API_CONTRACT.md`, `frontend/src/api/types.ts` cập nhật cùng lúc; `httpClient` và `mockClient` đối xứng.
- Frontend: mục "Nhật ký set" trong màn chi tiết nhiệm vụ cho mỗi mục checklist có tên khớp thư viện (`components/SetLog.tsx`): danh sách set đã ghi, hàng nhập rep (hoặc giây) + kg (nhận `42,5` hoặc `42.5`), "Ghi set N", xoá từng set, dòng "Lần trước (dd/mm): …", thông báo lỗi API ngay trong mục. Mục không có trong thư viện không có phần ghi set.
- Test: backend `WorkoutSetIntegrationTest` (9 test: 401, idempotent + không phân biệt hoa thường, không đụng XP/ledger/quest, xoá, validate, ngày/lịch, cô lập user, "lần trước" xuyên habit, ghi song song); frontend mock (6), `httpClient` (đường dẫn/phương thức/mã hoá), `SetLog.test.tsx` (8).

## Chưa làm / ghi nhận
- Biểu đồ tiến bộ theo bài, kỷ lục cá nhân (PR) và thưởng cho PR, gợi ý mức tạ, RPE/ghi chú từng set, đơn vị lb, xuất dữ liệu.
- Tự bật đếm ngược nghỉ sau khi ghi set (hiện vẫn bấm tay ở mục nghỉ).
- Ngày cũ ngoài cửa sổ 7 ngày chỉ xem được, không sửa được.
- Chưa kiểm bằng mắt ở 390px và chưa thử trên backend chạy thật với trình duyệt (backend được kiểm bằng integration test trên Postgres nhúng).
