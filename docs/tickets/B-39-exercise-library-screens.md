# B-39 — Thư viện bài tập và lọc theo nhóm cơ (màn 6, 7)

Trạng thái: **chưa làm, chờ owner duyệt**. Nguồn thiết kế: ảnh tham chiếu 10 màn của owner (2026-10-17). Owner duyệt **layout và hiệu ứng**, yêu cầu **giữ màu hiện tại** (nền tối + nhấn xanh chanh `--accent`). Không dùng nhân vật anime/tên "Shadow Hunter", "Shadow Aura" trong ảnh: bản quyền/gợi nhớ tác phẩm gốc; dùng hạng E–S, hình khung dây và tên riêng của app. Chỉ frontend, XP/streak/contract không đổi.

Trang danh sách bài từ `domain/exerciseLibrary.ts` (27 bài) có ô tìm, lọc theo nhóm cơ (Ngực, Lưng, Chân, Vai, Tay, Bụng) và chi tiết bài (B-37). Màn chọn nhóm cơ dùng sơ đồ cơ thể SVG riêng. Thêm bài vào buổi tập: cần sửa checklist của thói quen (đã có API `patch objectives`), làm sau khi owner duyệt.
