# B-05 — Vertical slice Journey & Streak

Mục tiêu: GET `/journeys/current` và `progress.currentStreak` tính đúng scheduled session và mức hoàn thành journey.

Bắt buộc có historical schedule/timezone. Hỗ trợ pause/resume effective date. Phân biệt ngày lịch đã trôi qua với mức hoàn thành theo schedule. Test: khoảng trống Thứ Sáu/Thứ Hai, pending của hôm nay, pause, session bị bỏ lỡ, thay đổi có hiệu lực từ ngày mai, ngày bắt đầu/kết thúc. Giải quyết ý nghĩa còn mở của global-streak trong DECISIONS.md trước khi triển khai.

## Trạng thái (2026-10-16)
Đã triển khai: migration V5 `journeys`, `GET /journeys/current`, `dashboard.journey`, `progress.currentStreak/longestStreak` và `streak` của quest mutation. Streak là hàm thuần (`StreakCalculator`) trên lịch sử schedule/lifecycle, không lưu. ADR-009 được chấp nhận tạm theo định nghĩa của UI (max per-habit); owner có thể đổi.
Journey: tạo lười khi đọc lần đầu, bắt đầu vào ngày đăng ký theo timezone user (tài khoản cũ cũng vậy), 66 ngày, 4 chặng 1–7/8–21/22–44/45–66. `elapsedDays` (timeline) tách khỏi `completedToDate/totalScheduledToDate` (nỗ lực).
Kiểm chứng: 89 test backend (thêm 9 unit streak: thứ Sáu/thứ Hai, pending hôm nay, bỏ lỡ, pause, năm nhuận; 12 integration: journey/chapter/boss, timezone UTC+14, streak qua HTTP, pause, cuối tuần, user khác).
Chưa làm: hạ boss (`BOSS_COMPLETE`) và achievement nên boss chỉ LOCKED/AVAILABLE, huy hiệu `earned=false`; streak đọc toàn bộ quest COMPLETED của user mỗi lần (ổn cho quy mô hiện tại, cần tối ưu khi lớn).
