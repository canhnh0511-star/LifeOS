# RPG-08 — Mở rộng backend tùy chọn (chỉ RFC)

**Phụ thuộc:** Chủ dự án sign-off UI RPG-07

## Mục tiêu
Sau khi chủ dự án duyệt frontend, đề xuất danh sách thay đổi contract backend. Ticket này **chỉ là tài liệu** trừ khi được cho phép riêng.

## Các tác vụ triển khai
1. So sánh state RPG chỉ-mock với API hiện tại.
2. Đề xuất các trường/endpoint tối thiểu có phạm vi theo auth cho avatar/equipment/inventory (và phân loại optional nếu muốn).
3. Cung cấp kế hoạch migration schema/DTO và tương thích ngược, sự kiện mở khóa idempotent, test.
4. Giữ backend thật nguyên vẹn cho đến khi có phê duyệt tiếp theo tường minh.

## Tiêu chí nghiệm thu
- RFC bằng văn bản với các client bị ảnh hưởng, rủi ro migration dữ liệu và kế hoạch test.
- Không thay đổi cơ sở dữ liệu, không gọi API, không triển khai server, không deploy.

## Ngoài phạm vi (loại trừ rõ ràng)
Toàn bộ việc triển khai production/backend trong ticket này.

## Bàn giao
Liệt kê các file đã đổi, lệnh test/build và kết quả, ảnh chụp màn hình nếu có, các hạn chế đã biết và mọi quyết định cần chủ dự án đưa ra. Dừng lại sau ticket này.
