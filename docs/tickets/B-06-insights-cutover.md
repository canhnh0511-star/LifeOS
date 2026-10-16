# B-06 — Analytics, Cutover & phát hành PWA

Mục tiêu: GET `/analytics/weekly` (7d) và `/analytics/monthly` (30d), tích hợp API thật, các trạng thái frontend và hướng dẫn deploy.

Tiêu chí chấp nhận: DTO tương thích với mock; archive/pause không viết lại lịch sử; biểu đồ phản ánh fixture; không lộ thông tin giữa các user; HTTPS; kiểm tra build/manifest/cài đặt; diễn tập backup+restore; cấu hình env cho dev/prod; kiểm tra accessibility và smoke test Safari.

Loại trừ: push notification, offline mutation sync, AI Coach.

## Trạng thái (2026-10-16)
Đã triển khai: `GET /analytics/weekly` (7 ngày) và `/analytics/monthly` (30 ngày) kết thúc ở hôm nay theo timezone user, kèm `previous` (kỳ liền trước cùng độ dài, không có `days`). Mỗi ngày: `scheduled` từ lịch sử schedule/lifecycle (pause hay sửa sau không viết lại quá khứ), `completed` từ quest COMPLETED, `xpEarned` từ ledger theo ngày của quest. `categories` luôn đủ 5 lĩnh vực, `scheduled=0` nghĩa là chưa có dữ liệu. Boss tính 1 scheduled vào `bossDate` theo lĩnh vực của boss. `completionRate = round(100*completed/scheduled)`, 0 nếu không có lịch.
Kiểm chứng: 98 test backend (thêm 9 test analytics: cửa sổ ngày đầy đủ, làm tròn 33%/67%, undo không để lại XP, pause không viết lại, kỳ trước, boss, không rò dữ liệu giữa user).
Chưa làm: diễn tập backup/restore, kiểm tra accessibility và Safari thật, PWA install/offline, rate limit đăng nhập, quản lý secret production; boss/achievement mutation.
