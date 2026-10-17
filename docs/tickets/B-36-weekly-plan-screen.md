# B-36 — Màn lịch tập tuần (màn 2)

Trạng thái: **chưa làm, chờ owner duyệt**. Nguồn thiết kế: ảnh tham chiếu 10 màn của owner (2026-10-17). Owner duyệt **layout và hiệu ứng**, yêu cầu **giữ màu hiện tại** (nền tối + nhấn xanh chanh `--accent`). Không dùng nhân vật anime/tên "Shadow Hunter", "Shadow Aura" trong ảnh: bản quyền/gợi nhớ tác phẩm gốc; dùng hạng E–S, hình khung dây và tên riêng của app. Chỉ frontend, XP/streak/contract không đổi.

Tuần Thứ 2–CN có điều hướng tuần trước/sau; mỗi ngày một thẻ: buổi tập (tên, nhóm cơ, phút, huy hiệu "Main Quest"), ngày hồi phục/nghỉ. Dữ liệu: nhiệm vụ từng ngày từ `getDashboard(date)` (ngày tương lai chỉ xem trước, backend đã hỗ trợ). Ngày hồi phục/nghỉ chưa là nhiệm vụ (không có khái niệm tuỳ chọn): hiển thị từ ghi chú giáo án hoặc để trống, không tạo habit 0 XP; cần quyết định riêng nếu muốn nhiệm vụ tuỳ chọn. Bấm một ngày mở chi tiết (chỉ xem nếu là tương lai).
