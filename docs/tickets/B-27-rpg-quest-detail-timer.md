# B-27 — Chi tiết nhiệm vụ và đồng hồ (RPG-03)

Trạng thái: **xong** (2026-10-17) · Chỉ frontend · Spec gốc: `docs/rpg/tickets/RPG-03_QUEST_INTERACTION.md`.

- `components/QuestSheet.tsx`: nút "Chi tiết" ở mọi dòng/thẻ nhiệm vụ và thẻ Main Quest. Gồm thông tin, danh sách bài tập (dùng lại `ObjectiveList`), đồng hồ buổi tập, đếm ngược nghỉ giữa set (60/90/120 giây), ghim Main Quest, nút "Xác nhận hoàn thành" và "Hoàn tác" có bước xác nhận ghi rõ XP bị trừ. Mobile: bottom sheet.
- Hoàn thành/hoàn tác đi qua `completion()` trong `App.tsx` (cùng hàng đợi checklist); sheet đọc từ dashboard đang sống nên không hiện số cũ.
- Đồng hồ (`ui/focusTimer.ts`) chỉ cục bộ, tính từ mốc thời gian lưu trong localStorage theo (nhiệm vụ, ngày): không gọi API, không hoàn thành, không XP. Thẻ Main Quest báo "đồng hồ đang chạy". Hết giờ nghỉ: dòng chữ + rung nếu thiết bị hỗ trợ.
- Chưa làm: âm thanh hết giờ nghỉ (bị trình duyệt chặn/iOS); kiểm nút 44px, safe-area, nút Back trên thiết bị thật.
