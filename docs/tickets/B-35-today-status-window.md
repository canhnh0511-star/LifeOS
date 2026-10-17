# B-35 — Hôm nay kiểu cửa sổ trạng thái (màn 1 của ảnh tham chiếu)

Trạng thái: **xong** (2026-10-17). Nguồn thiết kế: ảnh tham chiếu 10 màn của owner (2026-10-17). Owner duyệt **layout và hiệu ứng**, yêu cầu **giữ màu hiện tại** (nền tối + nhấn xanh chanh `--accent`). Không dùng nhân vật anime/tên "Shadow Hunter", "Shadow Aura" trong ảnh: bản quyền/gợi nhớ tác phẩm gốc; dùng hạng E–S, hình khung dây và tên riêng của app. Chỉ frontend, XP/streak/contract không đổi.

- Khối trạng thái nhân vật ở đầu: "Lv. N", "Hạng X · {tên giai đoạn}" (`domain/characterStage.ts`), thanh XP, "tổng / mốc kế tiếp XP", huy hiệu hạng lớn có quầng sáng; bấm mở tab Nhân vật.
- 4 ô tóm tắt: Chuỗi ngày (`dayStreak`), XP hôm nay, 7 ngày qua (xong/có lịch, từ `weekly` analytics), Hôm nay (xong/tổng); thanh tiến độ ngày.
- "Chỉ số nhanh": level 5 lĩnh vực từ `progress.areas` (thay 4 chỉ số Sức mạnh/Sức bền… của ảnh vì app chỉ có dữ liệu thật của 5 lĩnh vực).
- Thẻ Main Quest: nhãn "NHIỆM VỤ HÔM NAY · MAIN QUEST", chip độ khó, chip +XP, viền/quầng sáng xanh (nhịp sáng chậm, tắt khi giảm chuyển động), nút lớn "Bắt đầu buổi tập" **mở màn chi tiết** (không hoàn thành, không XP); nút Hoàn thành/Đánh dấu xong tất cả vẫn ở đó.
- Test: khối trạng thái, ô tóm tắt, chỉ số nhanh, nút Bắt đầu mở chi tiết mà không gọi hoàn thành.
- Chưa làm: ảnh nhân vật lớn ở đầu trang (ảnh tham chiếu dùng nhân vật anime, không dùng; cần owner chọn hình riêng), nút tìm kiếm, kiểm bằng mắt ở 390px.
