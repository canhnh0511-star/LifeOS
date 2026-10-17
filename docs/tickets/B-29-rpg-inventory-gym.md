# B-29 — Cải tiến kho đồ và phần thưởng cho gym (RPG-05, cải tiến B-22)

Trạng thái: **chưa làm** · Spec gốc: `docs/rpg/tickets/RPG-05_INVENTORY_REWARDS.md` · Theo ADR-036, không làm lại từ đầu mà cải tiến B-22.

- Thêm vật phẩm chủ đề gym vào danh mục (ảnh + một dòng trong `ItemCatalog`; luật rơi xác định của ADR-034 giữ nguyên).
- Huy hiệu theo buổi tập (`BADGE_FIRST_WORKOUT`, `BADGE_10_SESSIONS`): chỉ mở khi có bằng chứng từ dữ liệu thật (buổi đã hoàn thành); thiếu bằng chứng thì hiện khoá kèm điều kiện. Cần ADR/backend nếu cấp qua server (xem B-09 cho cơ chế achievement).
- Cải tiến hiển thị kho đồ: trạng thái khoá/mở/đang đeo, điều kiện mở khoá dễ đọc.
- Bất biến: vật phẩm chỉ thẩm mỹ, không XP; refresh không tạo thêm vật phẩm.
