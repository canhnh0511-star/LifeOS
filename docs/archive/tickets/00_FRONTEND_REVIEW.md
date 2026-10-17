> **SUPERSEDED** — lưu trữ, không còn là yêu cầu. Xem `docs/archive/SUPERSEDED.md` và `docs/PRODUCT_V1.md`.

# UI-00 — Build frontend + cổng duyệt

## Mục tiêu

Review và xác thực frontend được cung cấp (`frontend/`) trên browser cỡ desktop và iPhone. **Cấm làm backend trong ticket này.**

## Tiêu chí chấp nhận

1. `npm install`, `npm run build`, `npm test` đều thành công.
2. `npm run dev`: Today, Journey, Insights, Settings render không có lỗi console.
3. Tạo goal, tạo habit, complete quest, undo, complete lại; reload và kiểm tra trạng thái.
4. Xác minh analytics 7/30 ngày và điều hướng theo ngày.
5. PWA manifest, icon 192/512 và service worker có trong production build.
6. Review ở 1440x900 và 390x844, gồm cuộn modal, bàn phím, không có horizontal overflow.
7. Cung cấp screenshot hoặc preview để owner ký duyệt; liệt kê các vấn đề và xin duyệt rõ ràng.

## Ngoài phạm vi

Database, Spring Boot, login, AI coach, device sync, push notification.

## Trạng thái

**ĐÃ DUYỆT** bởi owner ngày 2026-10-15 ("oke duyệt ticket 00"). Backend B-01..B-06 được mở khóa. Xem `docs/QA_STATUS.md` cho các hạng mục chưa kiểm chứng (PWA install/offline, thiết bị thật, screen reader, tablet, trình duyệt khác).
