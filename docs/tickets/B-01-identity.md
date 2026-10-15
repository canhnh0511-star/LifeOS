# B-01 — Identity & nền tảng backend an toàn
**UI-00 đã được duyệt (2026-10-15) — ticket này được phép bắt đầu.**

Mục tiêu: backend Java 21 Spring Boot khởi động được, Flyway khởi tạo schema Postgres cho users, GET `/me`, secure auth session, health check; frontend kết nối được qua real adapter mà không cần thiết kế lại UI.

Tiêu chí chấp nhận: identity theo từng user ở phía server; cookie HttpOnly/Secure/SameSite; CSRF; lỗi request được chuẩn hóa; không có token trong localStorage; integration test bằng Testcontainers; không có production credential. Cần quyết định: local username/password hay OAuth provider.

Ngoài phạm vi: quests/XP. Hoàn thành khi: backend khởi động qua Docker Compose, auth test đạt, shape của GET `/me` khớp với TypeScript contract.

## Trạng thái (2026-10-15)
Đã triển khai: `backend/` (Java 21, Spring Boot 4.0.8, Flyway V1 `users`, auth + `/me`, health, lỗi chuẩn hóa), `docker-compose.yml` + `backend/Dockerfile`, frontend `AuthGate` (chỉ real mode), CSRF header trong `httpClient`. 21 integration test qua HTTP thật đạt; luồng đăng ký/đăng nhập/đăng xuất/reload đã chạy trong Chrome qua Vite proxy.
Chưa kiểm chứng: `docker compose up` và Testcontainers (máy này không có Docker); không có rate limit đăng nhập (cần trước khi public); chưa có reset mật khẩu/xác minh email.
Chạy local không Docker: `cd backend && ./mvnw spring-boot:test-run -Dspring-boot.run.main-class=app.lifeos.DevServer`, rồi `cd frontend && VITE_API_MODE=real npm run dev`.
