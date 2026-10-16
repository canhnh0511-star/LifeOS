# Deploy lên Railway (B-01)

Một service duy nhất: `Dockerfile` ở thư mục gốc build frontend (`VITE_API_MODE=real`), nhúng vào Spring Boot và phục vụ cùng origin với API (`/api/v1/*`). Cookie phiên SameSite=Lax vì thế hoạt động mà không cần CORS.

## Các bước

1. Railway → New Project → **Deploy from GitHub repo** → chọn `canhnh0511-star/LifeOS` (Root Directory để trống; `railway.json` đã khai báo Dockerfile và healthcheck `/actuator/health`).
2. Trong project: **+ New → Database → PostgreSQL**.
3. Service web → **Variables**, thêm tham chiếu tới Postgres (Railway điền giá trị thật):
   - `PGHOST` = `${{Postgres.PGHOST}}`
   - `PGPORT` = `${{Postgres.PGPORT}}`
   - `PGDATABASE` = `${{Postgres.PGDATABASE}}`
   - `PGUSER` = `${{Postgres.PGUSER}}`
   - `PGPASSWORD` = `${{Postgres.PGPASSWORD}}`
4. Service web → **Settings → Networking → Generate Domain**. Truy cập domain đó: màn hình đăng nhập hiện ra.

Không đặt `LIFEOS_COOKIE_SECURE` (mặc định `true`, đúng với HTTPS của Railway). `PORT` do Railway tự cấp.

## Biến tùy chọn
`LIFEOS_LOG_LEVEL` (INFO/DEBUG), `LIFEOS_DB_URL`/`LIFEOS_DB_USER`/`LIFEOS_DB_PASSWORD` (ghi đè `PG*`; URL dạng `jdbc:postgresql://host:port/db`).

## Xem log / truy vết
Railway → service → Logs. Lọc theo `requestId` (cũng nằm trong header `X-Request-Id` và body lỗi). Xem `backend/README.md`.

## Chưa có / lưu ý
- Chưa có rate limit đăng nhập: đừng chia sẻ domain công khai rộng rãi.
- Chưa kiểm chứng build Docker (máy dev không có Docker); lần deploy đầu là lần chạy đầu tiên của Dockerfile.
- Sau khi đăng nhập, dashboard/goal/habit chưa có endpoint (thuộc B-02+), UI sẽ hiện lỗi tải dữ liệu.
