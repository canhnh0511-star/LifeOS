# B-26 — Main Quest và độ khó (RPG-02, bản thu hẹp)

Trạng thái: **xong** (2026-10-17) · Chỉ frontend · Spec gốc: `docs/rpg/tickets/RPG-02_MISSION_BOARD.md`.

- Main Quest = nhiệm vụ chưa xong đầu tiên theo lịch, hoặc nhiệm vụ được ghim (`ui/mainQuest.ts`, ghim theo ngày, lưu trên thiết bị, chỉ ghim được hôm nay). Chỉ là ưu tiên hiển thị: cùng một `(habitId, date)`, trả XP thường một lần, không nhân đôi. Ghim hỏng/đã xong thì quay về chọn tự động.
- Thẻ nổi bật ghi "NHIỆM VỤ TRỌNG TÂM · MAIN QUEST"; trong danh sách nhiệm vụ đó có nhãn "Trọng tâm".
- Chip độ khó bằng chữ (Dễ 0–20, Vừa 21–40, Khó 41+ XP) từ `domain/difficulty.ts`; không đổi phần thưởng.
- Danh sách: chưa xong trước, đã xong sau, giữ thứ tự lịch trong mỗi nhóm.
- Không làm mục Optional: state không có khái niệm này (không gắn nhãn lại nhiệm vụ bắt buộc).
- Chưa kiểm bằng mắt: màu chip, bố cục 390px.
