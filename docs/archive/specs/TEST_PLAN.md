> **SUPERSEDED** — lưu trữ, không còn là yêu cầu. Xem `docs/archive/SUPERSEDED.md` và `docs/PRODUCT_V1.md`.

# Test plan / Checklist chấp nhận

## Test code hiện có
`frontend/src/domain/rules.test.ts` bao phủ ngưỡng level, loại trừ cuối tuần, ngày có lịch bị bỏ lỡ, ranh giới năm. Chạy `npm test` sau khi cài dependency.

## Các case cần bổ sung

### XP ledger
- PUT đầu tiên cộng reward; PUT thứ hai cộng 0.
- Hai PUT đồng thời chỉ cộng đúng một lần và lưu một completion event.
- DELETE sau PUT đảo ngược đúng reward đã snapshot; DELETE lặp lại = 0.
- PUT lại sau DELETE cộng một lần trong cycle mới; tổng khớp kỳ vọng.
- Crash giữa quest status và ledger write phải rollback cả hai.
- Đổi XP reward về sau không thể thay đổi các transaction cũ.

### Schedule và streak
- Habit Thứ Hai-Thứ Sáu hoàn thành Thứ Sáu và Thứ Hai, nghỉ cuối tuần => streak 2.
- Bỏ lỡ Thứ Sáu làm streak dừng ở Thứ Hai trừ khi Thứ Hai đã hoàn thành (khi đó streak 1).
- Task pending của hôm nay không được làm đứt streak của hôm qua cho đến nửa đêm local.
- Ranh giới Chủ Nhật sang Thứ Hai với Asia/Ho_Chi_Minh.
- Pause vào ngày hiệu lực hợp lệ không bị tính là bỏ lỡ; resume khôi phục schedule.
- Schedule lịch sử vẫn ổn định sau khi schedule được sửa để có hiệu lực từ ngày mai.
- Năm nhuận, cuối năm, chuyển đổi timezone.

### API/bảo mật
- 401 cho chưa xác thực, 403/404 cho truy cập chéo user.
- Validation: title rỗng, duration<=0, XP>100, weekdays rỗng, completion tương lai, backdate>7.
- Mọi DTO response của GET khớp `frontend/src/api/types.ts`.
- Refresh và browser history không làm trùng XP.
- Các request song song trùng lặp phải serializable/idempotent.

### UI/PWA
- Desktop 1440x900, tablet 768x1024, iPhone 390x844 và 320x568 không có horizontal overflow.
- Điều hướng ba tab; tạo goal; tạo habit; toggle completion; reload vẫn giữ dữ liệu.
- Thứ tự tab bằng bàn phím; Escape đóng modal; focus nhìn thấy được; nhãn hành động.
- Có các trạng thái initial/empty/error/loading/disabled.
- Manifest production gồm icon 192/512 và maskable; service worker precache các built asset.
- Sau lần tải online thành công đầu tiên, shell mở lại được khi offline; **ghi API khi offline không được hỗ trợ**.

## Checklist release
- [ ] UI được user review và duyệt
- [ ] Dependency đã cài và `npm run build` đạt
- [ ] `npm test` đạt
- [ ] Đã kiểm tra thủ công cài PWA trên mobile Safari
- [ ] Backend test đạt (sau giai đoạn backend)
- [ ] Đã diễn tập backup/restore (sau giai đoạn backend)
- [ ] Hoàn tất review HTTPS/bảo mật (sau giai đoạn backend)
