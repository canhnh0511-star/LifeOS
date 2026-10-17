# RPG-04 — Hunter Profile và tiến hóa avatar

**Phụ thuộc:** Ticket trước đã được duyệt

## Mục tiêu
Xây dựng trải nghiệm tiến triển avatar nguyên bản, neo vào Level thực tế.

## Các tác vụ triển khai
1. Chọn/tạo asset avatar nguyên bản: bóng dáng nhân vật nhất quán qua các giai đoạn.
2. Cài đặt ánh xạ năm giai đoạn thẩm mỹ theo level, huy hiệu/danh hiệu chỉ mang tính trình bày.
3. Thêm card Profile Status (level, XP, streak), chỉ số tùy chọn với cách tính tường minh hoặc nhãn demo.
4. Cung cấp SVG/bóng dáng dự phòng và cho phép chọn avatar trong tương lai mà không cần backend.
5. Thêm unit test cho các level ở ranh giới và trạng thái alt/focus dễ tiếp cận.

## Tiêu chí nghiệm thu
- Avatar thay đổi tại các ngưỡng level đã ghi tài liệu.
- Không sao chép nhân vật/trang phục/vật phẩm dễ nhận ra của Solo Leveling.
- Không có con số chỉ số nào được trình bày như đã đo đạc trừ khi suy ra từ dữ liệu có sẵn.
- UI vẫn nhanh trên mobile.

## Ngoài phạm vi (loại trừ rõ ràng)
Không backend, không đổi schema, không deploy production.

## Bàn giao
Liệt kê các file đã đổi, lệnh test/build và kết quả, ảnh chụp màn hình nếu có, các hạn chế đã biết và mọi quyết định cần chủ dự án đưa ra. Dừng lại sau ticket này.
