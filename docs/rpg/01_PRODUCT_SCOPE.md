# Trải nghiệm RPG — Phạm vi sản phẩm

## Mục đích sản phẩm
Life OS giúp một người tạo tiến bộ thật qua những hành động nhỏ, lặp lại được. Điều "fantasy" ở đây là sự tiến triển như trong RPG, không phải tối đa hóa phần thưởng: các tác vụ thật của người dùng quyết định XP và trạng thái cột mốc; tiến trình hình ảnh hỗ trợ động lực mà không thay thế các mục tiêu có ý nghĩa.

### Persona chính
Một người dùng Life OS hằng ngày trên PWA iPhone và đôi khi trên desktop: duy trì việc học nghề, piano, sức khỏe và thói quen đọc sách; muốn hành động rõ ràng, động lực và tiến bộ dài hạn.

### Jobs to be done
- Khi mở app: biết ngay **hôm nay phải làm gì** và tiến độ hiện tại.
- Khi bắt đầu một hoạt động: có thể bấm giờ (tùy chọn) mà không cảm thấy bị phạt khi bị gián đoạn.
- Khi hoàn thành: nhận tín hiệu thưởng thú vị nhưng ngắn gọn, gắn với kết quả thật đã lưu.
- Khi quay lại sau một ngày bỏ lỡ: thấy trạng thái đúng sự thật, không dùng ngôn từ gây xấu hổ hay thao túng streak.
- Hằng tuần: xem tiến độ theo từng lĩnh vực đời sống và có thể mở khóa phần thưởng thẩm mỹ.

### Các trang trong phạm vi
| Trang | Mục đích | MVP |
|---|---|---|
| Today | Status Window, mission board, trạng thái hành động, tóm tắt phần thưởng hằng ngày | Có |
| Quest detail | Giải thích mục tiêu, thời gian, tiến độ, timer, hoàn thành và Undo | Có |
| Hunter | Chân dung nhân vật, tiến hóa thẩm mỹ, huy hiệu, chỉ số | Có |
| Inventory trong Hunter | Vật phẩm trực quan: đã mở/khóa/đã trang bị | Có (mock và thẩm mỹ) |
| Journey | Cột mốc 66 ngày, tiến độ chương, goal/habit | Có |
| Insights | Giữ nguyên analytics hiện có, chỉnh theme nhẹ | Giữ nguyên hiện có |
| Settings | Giữ nguyên cài đặt hiện có, thêm tùy chọn reduced-motion | Có |

### Loại khỏi giai đoạn hiện tại
Dịch vụ backend mới, thiết kế lại auth, migration PostgreSQL, API asset bên ngoài, bảng xếp hạng xã hội, multiplayer, cửa hàng tiền thật, tỷ lệ loot, chatbot/AI coach, chiến đấu, PvP, kinh tế RPG phức tạp, thông báo, theo dõi focus chạy nền. Không tự động chứng minh hoạt động ngoài đời thật từ một timer.

### User story / nghiệm thu người dùng thấy được
- US-01: Tôi phân biệt được Main Quest nổi bật với các quest theo lịch khác mà nó không xuất hiện hai lần hay trả XP hai lần.
- US-02: Tôi có thể bắt đầu timer cục bộ, tạm dừng, và hoàn thành quest một cách tường minh; rời trang không nhận XP.
- US-03: Hoàn thành quest cập nhật trạng thái card, tiến độ XP, level và phản hồi thưởng nhất quán sau khi refresh.
- US-04: Tôi có thể xem chân dung Hunter và thấy giai đoạn tiến hóa gắn với level hiện tại.
- US-05: Tôi có thể xem huy hiệu đã đạt và thấy cái gì còn bị khóa, vì sao, và cách để đạt được.
- US-06: Tôi có thể xem bản đồ chương 66 ngày mà vẫn giữ sự phân biệt giữa số ngày lịch đã trôi qua và mức hoàn thành.
- US-07: App vẫn vận hành đầy đủ khi không có animation và trên mobile.

### Tông thiết kế
Anh hùng, tập trung, đáng thưởng, không trẻ con. Phần fantasy có thể nổi bật ở header chính và hình avatar; biểu mẫu, biểu đồ, ngày tháng và nhãn tác vụ vẫn chuyên nghiệp và dễ đọc. Tránh gây mặc cảm tội lỗi giả, hình phạt streak cưỡng ép, và các tuyên bố thành tích gây hiểu lầm.

### Các điểm review
1. Báo cáo audit repo/UI RPG-00; chủ dự án xác nhận phạm vi chính xác.
2. Ảnh chụp đầu tiên của RPG-01..02 ở mobile 390px và desktop 1440px; chủ dự án duyệt hình ảnh.
3. Các tương tác RPG-03..06 được xác thực trong chế độ mock.
4. QA đầy đủ RPG-07 và chủ dự án sign-off, sau đó mới cân nhắc mở rộng contract backend.
