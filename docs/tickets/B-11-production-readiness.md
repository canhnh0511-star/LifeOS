# B-11 — Sẵn sàng production và kiểm tra thiết bị thật

Trạng thái: **chưa làm** · Chặn bởi: không (một phần cần quyền truy cập Railway/thiết bị).

Hạng mục còn thiếu từ B-06:
- Docker: build image gốc và `docker compose up` chưa chạy được vì máy dev không có Docker; kiểm tra trên máy có Docker hoặc CI. Chạy Testcontainers trong CI.
- CI (GitHub Actions): chạy `./mvnw test`, `npm test`, `tsc`, `vite build` mỗi push.
- Diễn tập backup + restore Postgres trên Railway (ghi quy trình và thời gian khôi phục vào `docs/DEPLOY_RAILWAY.md`).
- Secret/ENV production: rà soát `LIFEOS_COOKIE_SECURE`, mật khẩu DB, không secret trong repo; tách cấu hình dev/prod.
- PWA: kiểm tra manifest, cài đặt trên iOS/Android, hành vi offline (đã loại trừ đồng bộ offline mutation); thêm `favicon.ico` (đang 404).
- Accessibility: screen reader thật, điều hướng bàn phím, tương phản; Safari iOS smoke test; kiểm tra tablet.
- Quan sát: log tập trung/tìm theo `requestId` trên Railway, cảnh báo lỗi 5xx.
- Hiệu năng cơ bản: xem B-13.
