# RPG-06 — Trình bày chương Journey

**Phụ thuộc:** Ticket trước đã được duyệt

## Mục tiêu
Tạo cho hành trình 66 ngày một bản đồ chương/cổng (gate) trực quan mà không đổi ngữ nghĩa về thời gian hay mức tuân thủ.

## Các tác vụ triển khai
1. Giữ nguyên journey hiện có và phần quản lý Goal/Habit.
2. Trình bày sáu chương mặc định, mỗi chương 11 ngày, như một cách nhóm ở lớp UI.
3. Gắn nhãn rõ ràng số ngày đã trôi so với số quest theo lịch đã hoàn thành.
4. Thêm hình ảnh cột mốc và cổng tương lai chỉ như các trạng thái thẩm mỹ suy ra từ dữ liệu đã biết.
5. Đảm bảo quy tắc ngày tháng và timezone không đổi.

## Tiêu chí nghiệm thu
- Hành trình 66 ngày vẫn là 66 ngày, bao gồm cả ngày cuối.
- Tiến độ chương không tuyên bố thành công chỉ dựa vào thời gian đã trôi.
- Goals/Habits vẫn truy cập được; không có mutation nghiệp vụ nào thêm.

## Ngoài phạm vi (loại trừ rõ ràng)
Không backend, không đổi schema, không deploy production.

## Bàn giao
Liệt kê các file đã đổi, lệnh test/build và kết quả, ảnh chụp màn hình nếu có, các hạn chế đã biết và mọi quyết định cần chủ dự án đưa ra. Dừng lại sau ticket này.
