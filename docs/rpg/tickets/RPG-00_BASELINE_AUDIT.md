# RPG-00 — Audit baseline và phân tích khoảng trống

**Phụ thuộc:** Không có

## Mục tiêu
Xác minh bối cảnh codebase/deployment **thực tế** và tạo kế hoạch triển khai **mà không sửa code**.

## Các tác vụ triển khai
1. Đọc AGENTS.md / CLAUDE.md hiện tại, tài liệu API/domain hiện có và brief RPG ngắn.
2. Kiểm tra điều hướng, phần render Today, việc hoàn thành quest và hành vi adapter mock-vs-real hiện tại.
3. Chạy baseline `npm run build` và `npm test` nếu dependency có sẵn.
4. Ghi lại chính xác các file/component có khả năng bị ảnh hưởng và các khoảng trống so với đặc tả này.
5. Nếu có trình duyệt, chụp Today/các màn hình khác ở mobile + desktop. Nếu không có trình duyệt, nêu chính xác những gì chưa được xác minh.
6. Đưa ra kế hoạch theo giai đoạn, các lựa chọn UI ban đầu nếu cần, và rủi ro bao gồm các khoảng trống contract backend.

## Tiêu chí nghiệm thu
- Không sửa mã nguồn.
- Báo cáo baseline trung thực và bằng chứng đạt/không đạt.
- Phân biệt rõ ràng bản deploy Railway hiện tại, repo đang checkout và archive v0.1 trước đó.
- Chủ dự án có thể duyệt phạm vi và phong cách trước khi triển khai.

## Ngoài phạm vi (loại trừ rõ ràng)
Không backend, không đổi schema, không deploy production.

## Bàn giao
Liệt kê các file đã đổi, lệnh test/build và kết quả, ảnh chụp màn hình nếu có, các hạn chế đã biết và mọi quyết định cần chủ dự án đưa ra. Dừng lại sau ticket này.
