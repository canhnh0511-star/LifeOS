# RPG-01 — Nền tảng theme và điều hướng

**Phụ thuộc:** Ticket trước đã được duyệt

## Mục tiêu
Đưa vào các design token RPG, khung layout và điều hướng bốn tab mà không làm mất chức năng của app.

## Các tác vụ triển khai
1. Tạo/tinh chỉnh theme token và các panel, button, badge, progress bar tái sử dụng được.
2. Giữ điều hướng chính trên mobile PWA là Today/ Journey/ Hunter/ Insights; Settings từ avatar.
3. Tạo khung Hunter giữ chỗ (placeholder) và các neo nội dung hiện có; giữ nguyên các luồng tạo/tạm dừng/lưu trữ (create/pause/archive).
4. Thêm hỗ trợ reduced-motion, độ rộng responsive, trạng thái focus và padding safe-area.
5. Tránh thay thế logic nghiệp vụ hoặc cài đặt API.

## Tiêu chí nghiệm thu
- `Today`, `Journey`, `Insights`, settings và CRUD vẫn truy cập được.
- Layout 390px đọc được và không tràn ngang.
- Dùng token chung thay vì style hardcode lặp lại.
- Test/build baseline đạt.

## Ngoài phạm vi (loại trừ rõ ràng)
Không backend, không đổi schema, không deploy production.

## Bàn giao
Liệt kê các file đã đổi, lệnh test/build và kết quả, ảnh chụp màn hình nếu có, các hạn chế đã biết và mọi quyết định cần chủ dự án đưa ra. Dừng lại sau ticket này.
