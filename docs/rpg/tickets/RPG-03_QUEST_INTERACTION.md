# RPG-03 — Chi tiết quest, focus timer và phản hồi XP

**Phụ thuộc:** Ticket trước đã được duyệt

## Mục tiêu
Làm cho Start, Pause, Confirm, Complete và Undo hoạt động với contract mutation hiện có.

## Các tác vụ triển khai
1. Thêm bottom sheet/modal Quest Detail với focus trap/đóng truy cập được.
2. Timer cục bộ hỗ trợ start/pause/resume, khôi phục thời gian đã trôi dựa trên timestamp; không có tác động thưởng.
3. Xác nhận hoàn thành chỉ qua phương thức hoàn thành hiện có của LifeOsApi; Undo qua phương thức đảo ngược hiện có.
4. Hiển thị toast XP/animation tiến độ chỉ khi mutation thành công và xpAwarded > 0; không ăn mừng trùng khi lặp lại.
5. Xử lý các trạng thái busy, error, ngày đã chọn và disabled; thêm các test liên quan.

## Tiêu chí nghiệm thu
- Chỉ Start thì không bao giờ ảnh hưởng trạng thái quest hay XP.
- Complete, complete lặp lại, undo, redo và reload hoạt động đúng.
- Modal dùng được bằng bàn phím và reduced motion.
- Test contract và domain đạt.

## Ngoài phạm vi (loại trừ rõ ràng)
Không backend, không đổi schema, không deploy production.

## Bàn giao
Liệt kê các file đã đổi, lệnh test/build và kết quả, ảnh chụp màn hình nếu có, các hạn chế đã biết và mọi quyết định cần chủ dự án đưa ra. Dừng lại sau ticket này.
