# B-02 — Vertical slice Goals & Habits

Mục tiêu: tạo/liệt kê/cập nhật Goals và Habits với persistence PostgreSQL thật. User đã xác thực sở hữu mọi record.

Endpoint: GET/POST/PATCH `/goals`; GET/POST/PATCH `/habits`. Validation cho title, category, target minutes, weekdays, XP, ownership.

Tiêu chí chấp nhận: các thao tác modal của UI chạy trên backend; dữ liệu còn khi refresh; effective schedule lịch sử bắt đầu từ hôm nay và chỉnh sửa có hiệu lực từ ngày mai; test 401/403 giữa các user. Migration gồm goals, habits, schedule version và lifecycle event.
