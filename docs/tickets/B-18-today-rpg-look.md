# B-18 — Diện mạo RPG cho màn Hôm nay (ảnh nền, cuộn nhiệm vụ, header)

Trạng thái: **chưa làm** · Lát 2/3 · Chỉ frontend · Cần owner duyệt UI (đã duyệt hướng 2026-10-16; duyệt ảnh nền trước khi dùng).

- **Ảnh nền/banner:** chiến binh đứng quay lưng trên đỉnh núi, nhìn lên mặt trăng giữa đêm tối (owner chọn, khác phong cách ảnh boss). Tạo bằng công cụ tạo ảnh có sẵn, lưu thành asset tĩnh (`frontend/public/art/`), tỉ lệ 2:1, chừa vùng tối để chồng chữ; tối ưu dung lượng (JPG/WebP, có bản nhỏ cho mobile). Bản thử đã sinh để owner xem.
- **Header Hôm nay:** Level + danh hiệu, thanh XP của level (`2.190 / 2.500`), chuỗi ngày (số thật từ B-19; trước khi B-19 xong hiển thị đúng nhãn "phiên" đang có, không giả số).
- **Nhiệm vụ như cuộn giấy / bảng nhiệm vụ:** thẻ có khung, huy hiệu lĩnh vực, trạng thái (chưa làm / đang làm n/m / hoàn thành), nhiệm vụ "tiếp theo" nổi bật; sau B-17 hiển thị danh sách mục bên trong thẻ.
- Hiệu ứng hoàn thành nhiệm vụ nhẹ, tôn trọng `prefers-reduced-motion`; độ tương phản chữ trên ảnh đạt WCAG AA; ảnh `aria-hidden`/decorative; tải ảnh không chặn việc dùng (lazy, có màu nền dự phòng).
- Không đổi dữ liệu hay API.

Test/kiểm tra: ảnh chụp desktop + mobile thật, kiểm tra không tràn ngang, test component cho header/thẻ nhiệm vụ, kiểm tra tương phản.
