# B-02 — Vertical slice Goals & Habits

Mục tiêu: tạo/liệt kê/cập nhật Goals và Habits với persistence PostgreSQL thật. User đã xác thực sở hữu mọi record.

Endpoint: GET/POST/PATCH `/goals`; GET/POST/PATCH `/habits`. Validation cho title, category, target minutes, weekdays, XP, ownership.

Tiêu chí chấp nhận: các thao tác modal của UI chạy trên backend; dữ liệu còn khi refresh; effective schedule lịch sử bắt đầu từ hôm nay và chỉnh sửa có hiệu lực từ ngày mai; test 401/403 giữa các user. Migration gồm goals, habits, schedule version và lifecycle event.

## Trạng thái (2026-10-16)
Đã triển khai: migration V2 (`goals`, `habits`, `habit_schedule_versions` với `weekday_mask`, `lifecycle_events`), `GET/POST/PATCH /goals`, `GET/POST/PATCH /habits`, package `goal/`, `habit/`, `lifecycle/`, `common/time/UserClock`. Mọi truy vấn có `user_id`; id của user khác trả 404 y hệt id không tồn tại; tạo habit trên goal của người khác trả 422 `goalId`. Đổi trạng thái ghi `lifecycle_events` hiệu lực từ ngày local kế tiếp (theo timezone của user); lặp lại cùng trạng thái không tạo event. Schedule version đầu tiên có hiệu lực từ `startDate`.
Kiểm chứng: 11 integration test mới (HTTP thật, Postgres thật), tổng 32; trong Chrome: đăng ký → tạo goal → tạo habit qua modal → reload vẫn còn → tạm dừng goal.
Ghi chú: `PATCH` nhận Map để khớp mock (`patch` field khi rỗng/field lạ); kiểu sai (ví dụ `targetMinutes` là chuỗi) trả 400 BAD_REQUEST thay vì 422 như mock. Chưa có: dashboard/quest/analytics (B-03+), nên Today/Insights vẫn báo lỗi tải; frontend nay nạp từng nguồn độc lập nên Journey vẫn dùng được. Habit chưa có API đổi lịch (schedule version thứ hai thuộc ticket sau).
