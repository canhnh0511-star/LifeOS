# RPG-05 — Inventory và phần thưởng xác định (deterministic)

**Phụ thuộc:** Ticket trước đã được duyệt

## Mục tiêu
Tạo một lớp sưu tầm thẩm mỹ mà không bịa XP, phần thưởng gameplay hay dữ liệu server.

## Các tác vụ triển khai
1. Danh mục vật phẩm cho huy hiệu/danh hiệu/khung/relic và ngôn ngữ hình ảnh về độ hiếm.
2. Các trạng thái LOCKED/UNLOCKED/EQUIPPED với điều kiện mở khóa dễ đọc.
3. Chỉ suy ra các phần thưởng được dữ liệu sẵn có hỗ trợ; quy tắc chưa giải quyết được thì hiển thị locked hoặc demo.
4. Giữ tùy chọn cosmetic mock trong localStorage có namespace; không hardcode XP kiếm được giả.
5. Test refresh idempotent, mutation lặp lại và luồng equip/unequip.

## Tiêu chí nghiệm thu
- Refresh không thể tạo thêm vật phẩm.
- Vật phẩm chỉ thẩm mỹ; không ảnh hưởng XP.
- Inventory truy cập được từ Hunter và có cảm giác nhất quán về hình ảnh.
- Thiếu bằng chứng thì không mở khóa phần thưởng một cách sai lệch.

## Ngoài phạm vi (loại trừ rõ ràng)
Không backend, không đổi schema, không deploy production.

## Bàn giao
Liệt kê các file đã đổi, lệnh test/build và kết quả, ảnh chụp màn hình nếu có, các hạn chế đã biết và mọi quyết định cần chủ dự án đưa ra. Dừng lại sau ticket này.
