# B-22 — Vật phẩm rơi từ rương (lát 3, thực hiện B-16 theo hướng "thợ săn")

Trạng thái: **làm một phần** · Phần 1 xong (2026-10-16, frontend): chạm rương đã đạt để mở, có hiệu ứng rung → bùng sáng, hiện XP và phần chia theo 5 lĩnh vực; rương chờ mở có hiệu ứng nhấp nhô; trạng thái "đã mở" lưu theo thiết bị (localStorage, chỉ là tiện ích xem — XP đã vào ledger từ lúc đạt mốc, ADR-033). Tắt hiệu ứng khi `prefers-reduced-motion`. Phần 2 (vật phẩm, kho đồ, đeo/tháo) **chưa làm**: cần backend, hình và owner chốt phong cách · Gộp với B-16.

Rương hằng ngày (B-19) có thể rơi **vật phẩm** có độ hiếm (thường/hiếm/sử thi), đeo/tháo được trên nhân vật. Cần: danh mục vật phẩm, kho đồ, trạng thái đeo, luật rơi **xác định được và đối soát được** (không ngẫu nhiên ẩn: cùng dữ liệu cho cùng kết quả hoặc ghi sự kiện rơi vào ledger), thu hồi khi rương bị thu hồi. Phong cách ảnh phải chốt trước (bản "line" từng bị chê xấu, xem B-16). Không bắt đầu trước khi owner chốt phong cách hình.
