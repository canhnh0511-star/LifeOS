# B-20 — Cảm hứng "thợ săn lên cấp": giao diện Hệ thống và hạng E–S (lát 1)

Trạng thái: **xong** · Chỉ frontend · Owner duyệt hướng 2026-10-16 ("lấy cảm hứng, không lấy trực tiếp nhân vật").

## Định hướng chung (áp dụng cho B-20 → B-23)
Người dùng là nhân vật chính, lúc đầu yếu và mạnh dần nhờ nhiệm vụ và phần thưởng. Lấy cảm hứng từ cơ chế chung của thể loại (hạng thợ săn, cửa ải, cửa sổ "Hệ thống", rương rơi vật phẩm, sưu tập sau khi hạ boss), **không** dùng nhân vật, tên riêng, cụm từ đặc trưng hay thiết kế của tác phẩm gốc (không tên nhân vật, không "Arise", không "Shadow Monarch/Army", không quân đội bóng). Mọi tên và hình là nguyên bản.
- **Không có hình phạt trừ XP ẩn** (DOMAIN_RULES). "Phạt" nếu có chỉ là cảnh báo bằng chữ, không đổi điểm.
- Phần thưởng chỉ hiện khi backend thực sự cấp; không control giả.

## Phạm vi B-20
- **Hạng theo level:** E (Lv 1–4), D (5–9), C (10–14), B (15–19), A (20–29), S (30+). Hạng tổng ở header Hôm nay và tab Nhân vật; hạng từng lĩnh vực (theo level của lĩnh vực) ở danh sách chỉ số. Thuần dẫn xuất từ level, không đổi API, không lưu.
- **Huy hiệu hạng:** hình khiên/lục giác có chữ hạng, màu theo hạng, `aria-label` "Hạng C".
- **Cửa sổ Hệ thống:** thông báo (toast) đổi thành khung xanh tím có nhãn "HỆ THỐNG"; phối màu nhấn xanh tím cho khối cấp độ và hero nhân vật. Hiệu ứng nhẹ, tôn trọng `prefers-reduced-motion`.
- Khi lên hạng (so với hạng trước khi hoàn thành nhiệm vụ) màn chúc mừng toàn màn hình hiện "LÊN HẠNG!" với huy hiệu hạng mới, chỉ dựa trên level thật từ backend. Toast thường có nhãn "HỆ THỐNG"; toast lỗi có nhãn "LỖI" và `role=alert`.

Test: hàm hạng đúng ở các ngưỡng (4/5, 9/10, 14/15, 19/20, 29/30), huy hiệu và nhãn truy cập, toast hạng khi level vượt ngưỡng; ảnh chụp desktop + mobile.
