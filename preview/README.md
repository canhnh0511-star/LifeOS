# Life OS — Bản xem trước trực quan không phụ thuộc

Thư mục này là **bản xem trước nhẹ bổ sung**, không phải mã nguồn production React.

Nó dùng lại các module đã biên dịch từ `frontend/src/api/mockClient.ts` và `frontend/src/domain/rules.ts`, nên bản demo tương tác chạy trên *cùng business engine mock*. UI viết bằng HTML và JavaScript thuần để chạy mà không cần npm.

Từ thư mục gốc repo:

```bash
python -m http.server 4173
# mở http://localhost:4173/preview/
```

Complete/undo quest, tạo goal/habit, điều hướng Today/Journey/Insights, export và reset demo. Dữ liệu demo chỉ nằm trong localStorage. Manifest cài đặt được và service worker app-shell đơn giản hỗ trợ xem trước PWA ở chế độ standalone qua localhost hoặc HTTPS.

Với mã nguồn triển khai và bàn giao backend, dùng `frontend/` và `docs/` làm nguồn chuẩn. Sau khi đổi quy tắc mock, hãy tái tạo `preview/api/mockClient.js` và `preview/domain/rules.js` từ các nguồn TypeScript.
