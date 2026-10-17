# Danh sách ticket

| Ticket | Nội dung | Trạng thái |
|---|---|---|
| 00 | Review frontend | Đã duyệt 2026-10-15 |
| B-01 | Identity | Xong |
| B-02 | Goals & habits | Xong |
| B-03 | Daily quest | Xong |
| B-04 | XP ledger | Xong |
| B-05 | Journey & streak | Xong (ADR-009 chấp nhận tạm) |
| B-06 | Analytics & cutover | Xong phần API; kiểm tra thiết bị thật chuyển sang B-11 |
| B-07 | Rate limit đăng nhập | Xong (ADR-027, bộ đếm trong bộ nhớ) |
| B-08 | Hạ boss | Xong (ADR-028) |
| B-09 | Achievement cấp/thu hồi | Xong (ADR-029) |
| B-10 | Sửa lịch habit, archive | Xong (ADR-030); chưa kiểm tra bằng trình duyệt |
| B-11 | Production readiness, a11y, PWA | Chưa làm |
| B-12 | Khôi phục tài khoản, xác minh email | Chưa làm, cần chọn dịch vụ email |
| B-13 | Hiệu năng và dọn điểm lệch | Chưa làm, ưu tiên thấp |
| B-14 | Sinh quest theo chỉ số | Cần thiết kế với owner |
| B-15 | Nhập kế hoạch thói quen hàng loạt | Xong phần API (ADR-029), chưa có UI; owner yêu cầu 2026-10-16 |
| B-16 | Trang bị: màn Trang bị, kho đồ, phần thưởng đeo/tháo | Chưa làm; trang bị đã gỡ khỏi thẻ nhân vật 2026-10-16, cần owner chốt phong cách ảnh |
| B-17 | Nhiệm vụ có danh sách mục tiêu (checklist số lượng) | Xong (ADR-032); chưa có giao diện sửa danh sách mục |
| B-18 | Diện mạo RPG cho Hôm nay (ảnh nền, cuộn nhiệm vụ, header) | Xong; lát 2, chỉ frontend |
| B-19 | Chuỗi ngày + Phần thưởng hôm nay (rương) | Xong; lát 3, sau B-17 |
| B-20 | Giao diện Hệ thống và hạng E–S (cảm hứng thợ săn lên cấp), lát 1 | Xong; chỉ frontend |
| B-21 | Cửa ải và ấn ký | Xong; lát 2, chỉ frontend |
| B-22 | Vật phẩm rơi từ rương (thực hiện B-16) | Xong (mở rương, 6 vật phẩm có truyện, kho đồ, đeo/tháo; ADR-034) |
| B-23 | Quái ngẫu nhiên và sự kiện | Ý tưởng; lát 4 |
| B-24 | Số đo cơ thể (cân nặng, vòng eo, mỡ %, chỉ số riêng) | Xong (ADR-035) |
| B-25 | Nền tảng giao diện RPG: biến CSS, giảm chuyển động (RPG-01) | Xong; chỉ frontend |
| B-26 | Main Quest, ghim, chip độ khó (RPG-02) | Xong; chỉ frontend |
| B-27 | Chi tiết nhiệm vụ, đồng hồ, nghỉ giữa set (RPG-03) | Xong; chỉ frontend |
| B-28 | Tiến hoá nhân vật theo level/rank (RPG-04) | Xong; chỉ frontend |
| B-29 | Cải tiến kho đồ/phần thưởng cho gym (RPG-05, cải tiến B-22) | Xong: 4 vật phẩm gym (danh mục 10 món, frontend + backend), 3 huy hiệu tập luyện từ `GET /badges` (ADR-038), lọc kho đồ. Chưa có ảnh vật phẩm mới (dùng biểu tượng thay thế) |
| B-30 | Cải tiến chương/cửa ải cho gym (RPG-06, cải tiến B-21) | Xong: nhãn "ngày đã qua" tách khỏi "nhiệm vụ có lịch đã xong" (kèm số đếm), ngày hiện tại trong chương |
| B-31 | QA liên màn hình và sign-off RPG (RPG-07) | Phần QA tự động xong (2026-10-17): xem docs/rpg/STATUS.md; còn kiểm trên iPhone thật/PWA/Railway |
| B-32 | Nội dung gym: giáo án mẫu, thư viện bài tập, nạp giáo án | Xong; chỉ frontend |
| B-33 | RFC backend cho lớp RPG (RPG-08) | RFC đã viết (docs/rpg/RFC_BACKEND_EXTENSIONS.md); owner quyết không triển khai, đóng |
| B-34 | Nhật ký từng set/rep/mức tạ (backend + frontend) | Xong (ADR-037) |
| B-35 | Hôm nay kiểu cửa sổ trạng thái (màn 1 của ảnh tham chiếu) | Xong; chỉ frontend, giữ màu xanh |
| B-36 | Màn lịch tập tuần (màn 2) | Xong (nút "Lịch tuần" ở Hôm nay; T2–CN, Main Quest, xem trước ngày tới) |
| B-37 | Chi tiết buổi tập dạng danh sách và chi tiết bài (màn 3, 4) | Xong: chi tiết bài (nhóm cơ chính/phụ, dụng cụ, độ khó, loại bài, kỹ thuật) mở từ checklist/thư viện/màn đang tập; đầu buổi có nhóm cơ và nút "Tập từng set" |
| B-38 | Màn đang tập từng set (màn 5) | Xong; chỉ frontend, giữ màu xanh |
| B-39 | Thư viện bài tập và lọc nhóm cơ (màn 6, 7) | Xong (tìm, lọc nhóm cơ, mở chi tiết; vào từ Hành trình); thêm bài vào buổi tập xong (checklist mới có hiệu lực từ ngày mai) |
| B-40 | Nhân vật và kho đồ theo ảnh tham chiếu (màn 8, 9; gộp B-29) | Xong: thẻ "Cấp kế tiếp", lọc kho đồ, gợi ý nơi rơi, khối Huy hiệu tập luyện (xem B-29) |
| B-41 | Thống kê tập luyện (màn 10) | Xong (mục Tập luyện trong Thống kê, 7/30 ngày, một request `GET /workout-stats` tính ở server (ADR-038); không có tab "Tất cả", tối đa 90 ngày) |

