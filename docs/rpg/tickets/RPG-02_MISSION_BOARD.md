# RPG-02 — Status Window và Mission Board

**Phụ thuộc:** Ticket trước đã được duyệt

## Mục tiêu
Chuyển Today thành một màn hình quest RPG hấp dẫn trong khi dữ liệu thật vẫn là nguồn có thẩm quyền.

## Các tác vụ triển khai
1. StatusWindow dùng ProgressDto; hiển thị tiến độ XP trong level.
2. Đưa một quest theo lịch thật lên làm Main; hiển thị các quest còn lại là Daily, không trùng lặp.
3. Cài đặt các trạng thái card pending/completed/error/empty, XP/nhóm độ khó chỉ để hiển thị.
4. Mục Optional chỉ cho dữ liệu mock optional được mô hình hóa tường minh; ẩn đi nếu không có.
5. Teaser phần thưởng hiển thị đúng số completed/required và earnedXpToday thực tế.

## Tiêu chí nghiệm thu
- Main không bị render đôi/trả thưởng đôi.
- Status Window đúng tại ranh giới level.
- Mọi hành động đều dùng được hoặc bị vô hiệu hóa kèm lý do rõ ràng.
- Điều hướng ngày hiện có hoạt động; không có tác vụ optional ma.

## Ngoài phạm vi (loại trừ rõ ràng)
Không backend, không đổi schema, không deploy production.

## Bàn giao
Liệt kê các file đã đổi, lệnh test/build và kết quả, ảnh chụp màn hình nếu có, các hạn chế đã biết và mọi quyết định cần chủ dự án đưa ra. Dừng lại sau ticket này.
