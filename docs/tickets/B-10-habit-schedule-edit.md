# B-10 — Sửa lịch tuần của habit, archive, sửa thông tin

Trạng thái: **xong** (ADR-030), owner đã duyệt đề xuất UI/contract ngày 2026-10-16.

Hiện tại: `PATCH /habits/{id}` chỉ nhận `status`; habit không đổi được `weekdays`, `endDate`, tên, thời lượng, XP. Bảng `habit_schedule_versions` đã sẵn sàng cho phiên bản thứ hai.

Phạm vi đề xuất: PATCH `weekdays` tạo schedule version mới hiệu lực từ ngày local kế tiếp (không bao giờ sửa version cũ); `endDate` kết thúc habit; đổi XP chỉ áp dụng cho quest chưa materialize (quest đã tạo giữ snapshot); sửa tên/thời lượng; archive giữ nguyên lịch sử. Cập nhật `openapi.yaml`, `types.ts`, mock và UI (modal sửa) sau khi owner duyệt.

Test bắt buộc: đổi lịch hôm nay chỉ có hiệu lực từ ngày mai; quá khứ và streak/analytics không đổi; hai lần đổi trong một ngày; ownership.
