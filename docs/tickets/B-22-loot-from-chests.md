# B-22 — Vật phẩm rơi từ rương (lát 3, thực hiện B-16 theo hướng "thợ săn")

Trạng thái: **xong** (phần 1: mở rương + hiệu ứng; phần 2: danh mục 6 món có truyện, rơi từ rương, kho đồ, đeo/tháo — ADR-034). Danh mục mới có 6 món; thêm món = thêm ảnh + một dòng trong `ItemCatalog`/`domain/items.ts`. Ảnh hiện là bản 200px, cần tạo lại độ phân giải cao khi mở rộng. Nhẫn và các món Huyền thoại khác chưa có.

Rương hằng ngày (B-19) có thể rơi **vật phẩm** có độ hiếm (thường/hiếm/sử thi), đeo/tháo được trên nhân vật. Cần: danh mục vật phẩm, kho đồ, trạng thái đeo, luật rơi **xác định được và đối soát được** (không ngẫu nhiên ẩn: cùng dữ liệu cho cùng kết quả hoặc ghi sự kiện rơi vào ledger), thu hồi khi rương bị thu hồi. Phong cách ảnh phải chốt trước (bản "line" từng bị chê xấu, xem B-16). Không bắt đầu trước khi owner chốt phong cách hình.
