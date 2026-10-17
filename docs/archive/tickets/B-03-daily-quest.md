> **SUPERSEDED** — lưu trữ, không còn là yêu cầu. Xem `docs/archive/SUPERSEDED.md` và `docs/PRODUCT_V1.md`.

# B-03 — Vertical slice Daily Quest

Mục tiêu: GET `/quests?date=...` và GET `/dashboard/today?date=...` tạo ra dữ liệu snapshot được lưu đúng cho ISO date theo local của user.

Triển khai `quest_instances` với unique user/habit/date, snapshot XP và category; logic effective-date của schedule history; không cộng XP khi GET; giữ nguyên quá khứ khi habit bị pause hoặc chỉnh sửa. Test: ngày nghỉ hằng tuần, cuối tuần, năm nhuận, ranh giới timezone, thay đổi status. Dashboard ban đầu có thể trả `progress` từ placeholder/ledger query cho đến B-04.

## Trạng thái (2026-10-16)
Đã triển khai: migration V3 `quest_instances` (unique `user_id, habit_id, scheduled_date`; snapshot `category`, `xp_reward`; `status`, `completed_at`), `GET /quests?date=` (bắt buộc) và `GET /dashboard/today?date=` (mặc định là hôm nay theo timezone user). Package `quest/` (`QuestRules` là định nghĩa duy nhất của "có quest vào ngày D"), `progress/` (placeholder).
Quy tắc: quest tồn tại khi `startDate <= D <= endDate?`, schedule version hiệu lực vào D có thứ của D, habit và goal đều ACTIVE vào D theo lifecycle. Ngày đã bắt đầu (D <= hôm nay của user) được materialize bằng `INSERT ... ON CONFLICT DO NOTHING` nên đọc đồng thời vẫn idempotent; ngày tương lai chỉ xem trước từ định nghĩa hiện tại và không lưu gì. GET không bao giờ cộng XP.
Kiểm chứng: 6 unit test luật (ngày nghỉ cuối tuần, năm nhuận 2028-02-29, version lịch mới không viết lại quá khứ, pause/resume, goal pause) và 13 integration test (401, shape contract, materialize một lần, snapshot reward, pause từ ngày mai, timezone UTC+14 vs UTC-11, ownership, 422 ngày sai).
Chưa làm (cố ý): complete/undo quest và ledger (B-04); `progress` luôn rỗng, `earnedXpToday=0`, `journey=null` (B-04/B-05); chưa có ranh giới 7 ngày cho GET (chỉ áp dụng khi ghi).
