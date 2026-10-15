# Trạng thái QA / Xác minh — 2026-10-13

## Đã xác minh trong môi trường này
- `frontend/src/App.tsx`, các file API, rules, main entry: kiểm tra cú pháp bằng TypeScript transpilation đã đạt (dùng transpiler global; đây KHÔNG phải typecheck đầy đủ).
- Các nguồn API/domain thuần TS được biên dịch sang JS bằng `tsc` global.
- Kiểm tra tích hợp runtime của Mock API đã đạt: PUT lặp lại cộng 0, DELETE lặp lại cộng 0, complete-sau-undo cho kết quả net đúng như mong đợi; tạo Goal/Habit xuất hiện trên Today; analytics trả về 7 ngày.
- HTML/JS/CSS/manifest/icon của bản preview độc lập trả HTTP 200 từ local Python HTTP server.
- `node --check` cho JS module của preview đã đạt.
- Đã xác minh CRC toàn vẹn của file ZIP sau khi đóng gói.

## Chưa xác minh — phải làm trên máy developer / coding agent
- `npm install`, `npm run build` và `npm test` cho frontend React: npm registry không truy cập được trong sandbox này. App chưa được typecheck/bundle đầy đủ ở đây.
- Kiểm tra trực quan tương tác bằng Chromium/Playwright: chính sách môi trường chặn điều hướng trình duyệt, kể cả URL local.
- Cài `Add to Home Screen` trên iOS Safari và hành vi offline.
- Backend Spring Boot thật (chưa triển khai, theo thiết kế).

## Hành động tiếp theo
Chạy ticket `docs/tickets/00_FRONTEND_REVIEW.md`; sửa mọi lỗi build/visual, sau đó xin duyệt UI rõ ràng. Phát triển backend vẫn bị chặn cho đến khi được duyệt.
