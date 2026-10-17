# RPG-07 — QA liên màn hình và sign-off

**Phụ thuộc:** Ticket trước đã được duyệt

## Mục tiêu
Xác minh toàn bộ UI và các hồi quy; chuẩn bị cho chủ dự án review trước khi đề xuất bổ sung backend.

## Các tác vụ triển khai
1. Chạy build/test đầy đủ; kiểm thử Q01–Q22 trong 04_QA_CHECKLIST.
2. Chụp ảnh mobile/tablet/desktop và các trạng thái, kèm lưu ý trung thực về trình duyệt/thiết bị.
3. Review khả năng tiếp cận và hiệu năng, tối ưu hình ảnh và reduced motion.
4. Kiểm tra sự tương đồng contract API; xác định nhưng không triển khai các khả năng server còn thiếu.
5. Tạo báo cáo nghiệm thu UI cuối cùng, ảnh chụp màn hình và danh sách vấn đề.

## Tiêu chí nghiệm thu
- Không có hành động quan trọng nào bị inert, XP trùng lặp hay luồng cốt lõi bị hỏng.
- Mobile và PWA hoạt động trong môi trường xác minh sẵn có.
- Các vấn đề đã biết được ghi lại.
- Chủ dự án duyệt trước bất kỳ ticket backend nào.

## Ngoài phạm vi (loại trừ rõ ràng)
Không backend, không đổi schema, không deploy production.

## Bàn giao
Liệt kê các file đã đổi, lệnh test/build và kết quả, ảnh chụp màn hình nếu có, các hạn chế đã biết và mọi quyết định cần chủ dự án đưa ra. Dừng lại sau ticket này.
