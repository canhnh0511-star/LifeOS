# B-28 — Tiến hoá nhân vật theo level/rank (RPG-04)

Trạng thái: **xong** (2026-10-17) · Chỉ frontend · Spec gốc: `docs/rpg/tickets/RPG-04_HUNTER_AVATAR.md`.

- `domain/characterStage.ts`: giai đoạn của nhân vật suy từ `rankForLevel` (một bộ ngưỡng duy nhất, hệ E–S theo ADR-036): Tân binh (E), Thức tỉnh (D), Tiên phong (C), Chiến tướng (B), Bậc thầy (A), Huyền thoại (S). Tên và màu là của riêng app; không lưu trạng thái, không XP.
- Hình khung dây đổi màu theo giai đoạn và thêm vòng đất khi lên hạng (2 → 3 vòng ở C, 4 vòng ở A). Dòng chữ "Hạng X · Tên" dưới hình để không chỉ dựa vào màu.
- Test: đổi giai đoạn đúng tại 4/5, 9/10, 14/15, 19/20, 29/30; tên/màu khác nhau; level lạ không lỗi; dòng chữ hiển thị.
- Chưa làm: trang phục/hào quang vẽ thêm trên hình, chọn avatar thay thế, chỉ số theo nhóm cơ (chờ B-32); chưa xem bằng mắt (màu có đủ tương phản trên nền tối chưa kiểm).
