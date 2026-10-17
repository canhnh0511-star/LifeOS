> **SUPERSEDED** — lưu trữ, không còn là yêu cầu. Xem `docs/archive/SUPERSEDED.md` và `docs/PRODUCT_V1.md`.

# UI Spec — Life OS 0.1

## Ngôn ngữ hình ảnh
- Dark productivity/RPG. Nền `#0b1018`, card `#151e2a`, accent lime `#c6fa55`, bổ trợ bằng cyan/blue/purple/emerald theo category.
- Desktop: sidebar trái 253px, header chính, hai cột dashboard chính/phụ. Desktop hẹp: sidebar thu gọn.
- Mobile <690px: bottom navigation 3 tab, Today xếp chồng, padding theo safe-area của mobile, PWA cài đặt được.
- Typography dùng system font stack; focus ring dễ tiếp cận, nhãn button có ý nghĩa, hỗ trợ prefers-reduced-motion.

## Today `/`
**Header**: tiêu đề, nút thêm habit, mock mode, ngày.
**Level hero**: XP và tiến trình level, biểu tượng tia điện mang tính trang trí.
**Hàng metric**: streak theo session, % hoàn thành quest, XP kiếm được trong ngày đã chọn.
**Daily quests**: điều khiển ngày trước/hôm nay/ngày sau, tiến độ, danh sách, CTA hoàn thành, XP reward. Vô hiệu hóa điều hướng sang tương lai. Backend từ chối mutation quá 7 ngày lịch sử.
**Cột phải**: điểm ngày dạng vòng tròn, biểu đồ hoạt động, teaser journey 66 ngày.
Danh sách rỗng có hành động tạo habit; lỗi mạng có nút tải lại.

## Journey
Hai metric: (số ngày lịch đã trôi qua của journey / duration) và (task đã lên lịch được hoàn thành / task đã lên lịch tới nay). Lưới goal: category, mô tả, phần trăm 7 ngày, các habit liên kết, hành động pause/resume. Modal tạo goal. Modal tạo habit: chọn goal, mục tiêu thời gian, preset XP cố định, lựa chọn ISO weekday, bắt đầu từ hôm nay.

## Insights
Bộ chọn kỳ 7d/30d. Metric tóm tắt, biểu đồ scheduled/completed, thanh theo category, reflection theo heuristic (KHÔNG phải phản hồi từ AI). Dữ liệu từ `AnalyticsDto`.

## Settings
Hiển thị chế độ mock / real; timezone; export JSON; reset demo (bắt buộc xác nhận). Không khẳng định có cloud sync.

## Trạng thái tương tác
- `loading`: spinner ban đầu trong khi Promise.all tải dữ liệu mock/HTTP.
- `error`: banner kèm nút thử lại.
- `updating`: vô hiệu hóa đúng quest đang có mutation chờ xử lý.
- `success`: toast; refetch dashboard/analytics.
- `offline`: app shell mở lại được sau lần tải thành công đầu tiên; mutation không được đảm bảo khi offline.
- `modal`: hủy bằng Escape, nút đóng, hoặc bấm backdrop.

## Kịch bản review (UX acceptance)
1. Mở viewport cỡ iPhone, điều hướng cả 3 tab, xác minh không có cuộn ngang.
2. Ở Today, hoàn thành một quest pending; xác minh XP, tiến độ và biểu đồ cập nhật.
3. Undo task rồi complete lại, xác minh XP trở về đúng tổng cũ.
4. Tạo goal Career, rồi tạo habit cho hôm nay; xác minh task xuất hiện.
5. Pause habit; xác minh hôm nay và các ngày đã qua không đổi, còn từ ngày mai habit không còn xuất hiện (toast nói rõ "có hiệu lực từ ngày mai"); resume cũng có hiệu lực từ ngày mai.
6. Reload; xác minh trạng thái local đã lưu.
7. Chuyển Insights 7d/30d và xác minh số liệu khác nhau phù hợp.
8. Settings export mock JSON; sau đó reset và xác minh dữ liệu mẫu được khôi phục.
9. Chạy production build và xác minh manifest/icon có mặt; cài qua Safari/Chrome.

## Các điểm khác biệt đã biết của demo so với backend cuối cùng
- Streak hiển thị ở Today là max current streak theo scheduled session của từng habit, không phải streak ngày toàn cục của mọi habit.
- Mock đã ghi pause/resume bằng lifecycle event có hiệu lực từ ngày mai nên lịch sử không bị viết lại; backend vẫn cần `habit_lifecycle_events` và quest instance bất biến ở B-03.
- Demo user là mock được seed; màn hình đăng nhập được cố ý hoãn sang B-01.
