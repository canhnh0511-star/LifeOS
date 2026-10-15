# B-06 — Analytics, Cutover & phát hành PWA

Mục tiêu: GET `/analytics/weekly` (7d) và `/analytics/monthly` (30d), tích hợp API thật, các trạng thái frontend và hướng dẫn deploy.

Tiêu chí chấp nhận: DTO tương thích với mock; archive/pause không viết lại lịch sử; biểu đồ phản ánh fixture; không lộ thông tin giữa các user; HTTPS; kiểm tra build/manifest/cài đặt; diễn tập backup+restore; cấu hình env cho dev/prod; kiểm tra accessibility và smoke test Safari.

Loại trừ: push notification, offline mutation sync, AI Coach.
