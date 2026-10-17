# B-38 — Màn đang tập từng set (màn 5)

Trạng thái: **xong** (`ActiveWorkout.tsx`, mở bằng nút "Tập từng set" trong chi tiết nhiệm vụ; 264 test đạt, build thành công; chưa chụp ảnh 390px trên trình duyệt thật). Nguồn thiết kế: ảnh tham chiếu 10 màn của owner (2026-10-17). Owner duyệt **layout và hiệu ứng**, yêu cầu **giữ màu hiện tại** (nền tối + nhấn xanh chanh `--accent`). Không dùng nhân vật anime/tên "Shadow Hunter", "Shadow Aura" trong ảnh: bản quyền/gợi nhớ tác phẩm gốc; dùng hạng E–S, hình khung dây và tên riêng của app. Chỉ frontend, XP/streak/contract không đổi.

Dựa trên nhật ký set của B-34: "Set N / M", mục tiêu rep, bộ tăng giảm (−/+) cho rep và mức tạ (kg), thời gian nghỉ (−/+), nút "Hoàn thành set" ghi set qua `recordWorkoutSet` và tự bật đếm ngược nghỉ; danh sách set đã xong/chưa. Không XP theo set; hoàn thành buổi vẫn bằng xác nhận.
