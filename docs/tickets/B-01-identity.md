# B-01 — Identity & nền tảng backend an toàn
**UI-00 đã được duyệt (2026-10-15) — ticket này được phép bắt đầu.**

Mục tiêu: backend Java 21 Spring Boot khởi động được, Flyway khởi tạo schema Postgres cho users, GET `/me`, secure auth session, health check; frontend kết nối được qua real adapter mà không cần thiết kế lại UI.

Tiêu chí chấp nhận: identity theo từng user ở phía server; cookie HttpOnly/Secure/SameSite; CSRF; lỗi request được chuẩn hóa; không có token trong localStorage; integration test bằng Testcontainers; không có production credential. Cần quyết định: local username/password hay OAuth provider.

Ngoài phạm vi: quests/XP. Hoàn thành khi: backend khởi động qua Docker Compose, auth test đạt, shape của GET `/me` khớp với TypeScript contract.
