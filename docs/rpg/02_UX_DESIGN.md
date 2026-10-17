# Đặc tả UX / Hình ảnh — Dark RPG Productivity

## Kiến trúc thông tin
- Điều hướng chính, thanh dưới trên mobile: **Today · Journey · Hunter · Insights** (bốn tab); settings qua avatar/menu. Giữ khả năng truy cập việc tạo Goal/Habit hiện có, điều khiển archive/pause và lịch sử. Desktop có thể dùng sidebar.
- Thứ bậc hình ảnh của nội dung chính: `StatusWindow -> tiêu đề nhiệm vụ hôm nay -> Main Quest -> Daily Quests -> Optional Quests (khi có) -> Daily Reward Summary`.
- Không yêu cầu tùy chỉnh tài khoản/avatar trước khi hoàn thành quest đầu tiên.

## Design token hệ thống
```css
:root {
  --rpg-bg: #080D19;
  --rpg-surface: #141E31;
  --rpg-surface-hover: #1B2942;
  --rpg-primary: #4389FF;
  --rpg-violet: #895BEE;
  --rpg-legendary: #F4C45B;
  --rpg-success: #33C9A2;
  --rpg-text: #F5F7FF;
  --rpg-muted: #AFBDD5;
  --rpg-line: #30415F;
  --rpg-radius-card: 16px;
}
```
Đây là điểm khởi đầu; hãy kiểm tra độ tương phản trên các nền thực tế đã triển khai và điều chỉnh theo token thiết kế hiện có thay vì đưa vào một hệ token thứ hai khó quản lý.

## Màn hình Today — chi tiết component
**StatusWindow (phía trên)**
- Chân dung: avatar nguyên bản người dùng có thể chọn, không bao giờ là bản sao nhân vật Solo Leveling.
- Hiển thị level (`ProgressDto.level`), XP đã kiếm được (`ProgressDto.totalXp`), khoảng `levelStartXp..nextLevelXp`, streak theo buổi có lịch (`currentStreak`) và danh hiệu (thẩm mỹ, ánh xạ cục bộ).
- Tiến độ XP = clamp((totalXp - levelStartXp)/(nextLevelXp-levelStartXp),0,1); tránh diễn giải totalXp/nextLevelXp như phần trăm của level hiện tại.
- Mobile: card trạng thái nằm ngang gọn; chân dung không lớn hơn ~80px; không để nền quá lớn chặn các quest ở phía trên màn hình đầu (above the fold).

**Mission Board**
- Highlight đúng MỘT quest theo lịch hiện có là `MAIN` (ưu tiên ghim thủ công; nếu không thì chọn theo cách xác định; gắn nhãn đó là ưu tiên hiển thị, không phải ID quest mới).
- Các quest theo lịch khác xuất hiện trong `DAILY` đúng một lần, sắp xếp theo ưu tiên, chưa xong trước hoàn thành sau trừ khi người dùng chọn khác.
- Mục Optional **chỉ** hiển thị cho các mục mock được đánh dấu optional rõ ràng; không suy ra optional từ phần thưởng thấp hay danh mục.
- Quest card: biểu tượng/hình minh họa, tiêu đề, danh mục, số phút dự định, chip độ khó, XP nhận khi hoàn thành, trạng thái, tiến độ và hành động chính. Độ khó có thể *chỉ để hiển thị*, suy từ ngưỡng XP hiện có: Easy 0–20, Medium 21–40, Hard 41–100; điều này không thay đổi phần thưởng gốc.
- Các trạng thái: Pending (Start), In progress (Resume / Pause / Complete), Completed (Completed + Undo truy cập được), Unavailable (vô hiệu hóa + giải thích), Loading, Error, Empty.
- Card đã hoàn thành mặc định không được cung cấp thêm nút nào trao XP.

**Quest detail sheet**
- Hiển thị mục tiêu, ghi chú, thời lượng mục tiêu, một focus timer không có thẩm quyền (non-authoritative), và CTA `Xác nhận hoàn thành` rõ ràng.
- Timer được lưu như *metadata UI cục bộ* (ví dụ startedAt trong localStorage, tính thời gian đã trôi từ timestamp sau khi reload; một interval timer riêng thì không bền vững). Thời gian tạm dừng chỉ lưu cục bộ; trên thiết bị khác không đảm bảo.
- Trạng thái có thẩm quyền chính đến từ `GET /quests` và response của mutation. Timer không phải bằng chứng hoàn thành tác vụ và không tự động gọi hoàn thành.

**Phản hồi khi hoàn thành**
- Sau khi thành công, cập nhật query state đã chuẩn hóa và hiển thị toast `+N XP`, hiệu ứng lấp đầy thanh ngắn, và modal cột mốc chỉ khi tiêu chí thực sự đạt.
- Một yêu cầu hoàn thành lặp lại hoặc idempotent (`xpAwarded: 0`) KHÔNG ĐƯỢC lặp lại toast thưởng hay mở khóa rương.
- Khi thất bại, hiển thị lỗi không chặn và giữ state nhất quán; không bao giờ animate XP trước khi server/mock xác nhận thành công.
- Người dùng có thể undo từ quest detail kèm xác nhận giải thích nếu lỡ tay; sau Undo, chỉ gỡ tiến độ thưởng lạc quan (optimistic) sau khi nhận response thành công.

**Tóm tắt phần thưởng**
- `done/required` loại trừ rõ ràng mục optional khi có dữ liệu đó. Tránh bịa `4/5` nếu chỉ hoàn thành một.
- Hiển thị `earnedXpToday` thực tế; teaser rương/thành tựu chỉ hiển thị khi điều kiện mở khóa xác định đã được đáp ứng.

## Màn hình Hunter
- Chân dung fantasy anime nguyên bản (cùng bản sắc nhân vật qua mọi giai đoạn). Cho phép avatar thay thế về sau; không ép giới tính hiển thị mặc định.
- Đề xuất ánh xạ cosmetic:
  - L1–4 **Initiate**: quần áo đơn giản, ánh sáng viền mờ.
  - L5–9 **Awakened**: viền xanh, hào quang nhỏ.
  - L10–19 **Vanguard**: chi tiết áo choàng/giáp, khung mạnh hơn.
  - L20–34 **Ascendant**: hiệu ứng xanh-tím trang trí, bóng dáng ấn tượng.
  - L35+ **Sovereign**: điểm nhấn vàng danh giá, không giống tác phẩm có bản quyền.
- Tránh danh hiệu `Shadow Monarch`, `Sung Jin-Woo`, trang phục/vũ khí dễ nhận ra đúng nguyên mẫu hay tranh chính thức.
- Các nhóm chỉ số `FOCUS`, `KNOWLEDGE`, `STRENGTH`, `CREATIVITY`, `DISCIPLINE` chỉ là *chỉ báo suy ra từ hoạt động* sau khi có cách tính được ghi tài liệu rõ ràng. Với mock tĩnh ban đầu, dùng dấu `Demo data` nổi bật; không bao giờ trình bày số liệu chưa triển khai như hiệu suất theo dõi thật.
- Inventory là tab/mục bên trong Hunter: độ hiếm vật phẩm, điều kiện mở khóa, unlockedAt, cờ equipped (chỉ thẩm mỹ), empty state.

## Màn hình Journey
- Giữ nguyên lịch 66 ngày gốc, phần trăm và các công cụ quản lý Goal/Habit.
- Cách nhóm hiển thị: mặc định sáu chương, mỗi chương 11 ngày, không thay đổi thời lượng hành trình. Làm nổi bật riêng các ngày đã qua và các cột mốc hoàn thành; tiến độ chương dựa trên thời gian đã trôi **hoặc** hoạt động đã xác thực tùy theo nhãn (không bao giờ nhầm lẫn hai thứ).
- `Gate` có thể là card chương được cách điệu; không có gameplay dungeon/chiến đấu chức năng trong MVP.

## Animation / hiệu năng / khả năng tiếp cận
- Toast XP ngắn (thường <= 1 giây), pulse/glow tinh tế; tránh animation liên tục phía sau chữ. Tôn trọng `prefers-reduced-motion: reduce` và một tùy chọn người dùng.
- Hình minh họa: dùng WebP/AVIF đã tối ưu (nơi hỗ trợ), tỉ lệ khung cố định và lazy-load phần dưới màn hình. Tránh video nền lớn và hàng chục animation khung hình. Cung cấp ảnh dự phòng nhẹ.
- Vùng chạm >= 44×44 CSS pixel; độ tương phản chữ nội dung đạt mục tiêu WCAG AA; focus nhìn thấy được; ngữ nghĩa button; nhãn mô tả cho icon; không dùng chỉ màu để biểu thị trạng thái; không cuộn ngang ở 390px; hiển thị đúng trạng thái busy/disabled.
- Thanh điều hướng dưới và quest sheet phải hoạt động với safe area của mobile và hành vi back/history của trình duyệt.

## Ví dụ copy
- Trang: `Nhiệm vụ hôm nay` — `Mỗi hành động giúp bạn trở thành phiên bản tốt hơn.`
- Main: `Nhiệm vụ trọng tâm` / `MAIN QUEST`
- CTA: `Bắt đầu`, `Tạm dừng`, `Tiếp tục`, `Xác nhận hoàn thành`, `Hoàn tác`
- Phần thưởng: `Phần thưởng đã mở khóa`, `Chưa đạt điều kiện`, `Đã trang bị`
- Streak: `Chuỗi phiên đúng lịch`, không nhất thiết là các ngày liên tiếp.

## Tham chiếu nguồn
`reference/quest-screen-concept.png`: concept được tạo ra từ cuộc chat trước đó. **Bỏ qua ngày hiển thị, phép tính số học, trạng thái rương và cấu trúc app hiện có cụ thể**; dữ liệu API thực tế và đặc tả này mới là thẩm quyền.
