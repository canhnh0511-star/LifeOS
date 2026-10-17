# B-25 — Nền tảng giao diện RPG (RPG-01, bản thu hẹp)

Trạng thái: **xong** (2026-10-17) · Chỉ frontend · Spec gốc: `docs/rpg/tickets/RPG-01_DESIGN_FOUNDATION.md`.

- Rút 7 biến CSS từ palette hiện có (`--bg`, `--surface`, `--line`, `--text`, `--text-strong`, `--text-muted`, `--accent`) và thay các màu lặp nhiều nhất; giá trị giữ nguyên nên diện mạo không đổi. **Không** thêm bảng token `--rpg-*` thứ hai.
- Tuỳ chọn "Giảm chuyển động" trong Cài đặt (`ui/motion.ts`): lưu theo trình duyệt, tắt hiệu ứng CSS và hiệu ứng mở rương; cài đặt hệ thống luôn được tôn trọng.
- Chưa làm: thay hết màu viết cứng còn lại (CSS và `.tsx`); đo vùng chạm 44px và tương phản bằng trình duyệt thật.
