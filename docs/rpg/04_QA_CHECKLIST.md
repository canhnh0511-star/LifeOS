# UX RPG — Tiêu chí nghiệm thu & Ma trận QA

## Bằng chứng hình ảnh bắt buộc
- Tối thiểu ảnh chụp/ghi hình ở **mobile 390×844**, **tablet 768×1024**, **desktop 1440×900**.
- Chụp Today với quest pending, in-progress, completed; Quest detail sheet; các giai đoạn Hunter; Inventory locked/unlocked; Journey; Insights; Settings.
- Đảm bảo ảnh chụp và concept art khớp về *phong cách*, không phải số liệu bịa hay kết quả backend giả. Luôn gắn nhãn trạng thái chỉ-demo.

## Ma trận kiểm thử chức năng
| ID | Kịch bản | Kết quả mong đợi |
|---|---|---|
| Q01 | Chọn main quest | Cùng `(habitId,date)` xuất hiện đúng một lần; không có XP thêm |
| Q02 | Hoàn thành quest pending | Một mutation; card chuyển completed, tiến độ cập nhật từ response |
| Q03 | Hoàn thành lại / bấm lặp | `xpAwarded=0` và không có hiệu ứng ăn mừng trùng |
| Q04 | Undo hoàn thành thành công | Delta âm đúng, state về pending, quy tắc mở khóa vật phẩm vẫn nhất quán |
| Q05 | Hoàn thành sau undo | Thưởng mới hợp lệ, không có thưởng thêm ngoài ý muốn |
| Q06 | Chạm Start rồi chuyển trang | Không ghi nhận XP hay hoàn thành |
| Q07 | Pause, refresh, resume timer | Thời gian đã trôi được khôi phục hợp lý; không có XP nếu chưa xác nhận |
| Q08 | API lỗi | Phản hồi rõ ràng; không có XP ma / số liệu không nhất quán |
| Q09 | Quest hôm nay đang pending | Streak không bị đứt sớm khi ngày vẫn còn mở |
| Q10 | Cuối tuần không có lịch | Streak không đổi; cách diễn đạt "buổi" đúng |
| Q11 | Đổi ngày được chọn | Main quest chỉ chọn lại trong số quest có lịch thật của ngày đó |
| Q12 | Refresh app | Không nhân đôi XP, mở khóa hay vật phẩm |
| Q13 | Ngưỡng level | Giai đoạn avatar tương ứng được mở khóa đúng một lần |
| Q14 | Không có bằng chứng mở khóa | Phần thưởng hiển thị locked/unknown, không bị tính là đã đạt sai |
| Q15 | Goal/habit rỗng | CTA rõ ràng và trạng thái trống hữu ích |
| Q16 | API không có optional | Nhóm optional bị ẩn; mẫu số không đổi |
| Q17 | CRUD Goal/Habit | Mọi hành động trước đó đang hoạt động vẫn còn dùng được |
| Q18 | Mobile nhỏ | Không cuộn ngang, vùng chạm >=44px, safe-area đúng |
| Q19 | Reduced motion | Không mất ý nghĩa thiết yếu; animation được giảm nhẹ |
| Q20 | Bàn phím/trình đọc màn hình | Thứ tự tab hợp lý, nhãn, focus, đóng dialog và thông báo trạng thái |
| Q21 | PWA | Manifest/icon và hành vi cache asset không đổi; reload điều hướng đúng |
| Q22 | Chế độ mock vs thật | Tính năng mới không gọi các route backend chưa có ở chế độ thật |

## Hướng dẫn unit / integration
- Test logic domain: level→giai đoạn avatar, phần trăm thanh XP, chọn Main Quest, mẫu số optional, tính idempotent của mở khóa inventory.
- Test UI: Start/pause/complete/undo; loading/error, trạng thái trống; mission card; thứ tự tab a11y.
- Hồi quy: baseline `npm run build` và `npm test`; chỉ thêm Playwright smoke nếu có công cụ/dependency; không giả vờ ảnh chụp hay test trình duyệt đã chạy nếu thực tế không chạy.
- Thủ công trên mobile: hành vi PWA ở màn hình chính iPhone Safari khi có thể; nêu minh bạch việc thiếu test trên thiết bị thật.

## Cổng sign-off UI
Chủ dự án chấp nhận: mock Today cuối cùng và phong cách chân dung, UX phần thưởng, responsive mobile, các điều khiển hoạt động thật, XP/Streak nhất quán và không có hồi quy. Nếu không được duyệt: tinh chỉnh ticket hiện tại; **không chuyển sang backend**.

## Mẫu báo cáo bàn giao
```text
Ticket:
Changed files:
Screenshots / demo path:
Tests run and outcomes:
Manual checks:
Business rule impacts (should be none):
Open decisions / risks:
Scope not implemented:
Recommendation / next ticket:
```
