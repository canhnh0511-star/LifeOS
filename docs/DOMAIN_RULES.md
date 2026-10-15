# Domain Rules — Life OS v1

## Ngữ nghĩa thời gian
- Instant lưu ở UTC `TIMESTAMPTZ`; `scheduledDate` là ISO `YYYY-MM-DD` theo IANA timezone của user.
- Timezone mặc định `Asia/Ho_Chi_Minh`; ISO weekday 1=Thứ Hai ... 7=Chủ Nhật.
- Từ chối completion trong tương lai. Cho phép backdate tối đa 7 ngày lịch (bao gồm cả mốc 7).
- Đồng hồ server là nguồn chuẩn; không bao giờ tin `today` của browser trên backend thật.
- Một habit có quest vào ngày D khi `startDate <= D <= endDate?`, schedule version bao phủ D, và lifecycle status vào ngày D là active.

## Mô hình XP
Reward cố định mặc định: Easy 20; Medium 35; Medium+ 40; Hard 50; tối đa 100 cho mỗi scheduled quest. Reward được snapshot khi quest được materialize lần đầu; đổi reward của habit không được viết lại XP trong quá khứ.

- `PUT /quests/{habitId}/dates/{date}/completion`: chưa hoàn thành -> hoàn thành, ghi thêm `QUEST_COMPLETE` +reward; hoàn thành -> hoàn thành, không tạo transaction và `xpAwarded=0`.
- `DELETE` khi đã hoàn thành -> pending, ghi thêm `QUEST_REVERT` -reward; pending -> pending, không tạo transaction và `xpAwarded=0`.
- Hoàn thành sau khi undo: ghi thêm một `QUEST_COMPLETE` *mới* với số cycle tăng lên. Duy trì khóa sự kiện duy nhất `(questId, cycle, eventType)` và mutation idempotent dưới DB lock.
- Không bao giờ ghi đè ledger event; `SUM(xp_transactions.amount)` cho ra tổng XP thực. Từ chối tổng XP âm sau các compensation (điều này không thể xảy ra với các transition bình thường).
- Idempotency được yêu cầu theo **trạng thái kết quả**, bao gồm cả các request trùng lặp đồng thời.
- `xpAwarded` của API = delta của *request này*, không phải reward trong lịch sử.

## Công thức level
```
level(0..399 XP) = 1
level(n XP) = max(1, floor(sqrt(n / 100)))
level_start_xp(level 1) = 0
level_start_xp(L>=2) = 100 * L^2
next_level_xp(L) = 100 * (L+1)^2
```
Ví dụ: 400 XP -> Level 2; 900 -> L3; 1600 -> L4; 2500 -> L5. Để lên L5 từ L4 cần thêm 900 XP. Không có ngưỡng cứng dựa trên sức khỏe hay hiệu suất công việc.

## Streak: scheduled-session streak
Với mỗi habit, dùng các ngày theo schedule hiệu lực, *không* dùng ngày lịch liền kề. Thứ Bảy/Chủ Nhật nghỉ không làm đứt streak của schedule Thứ Hai-Thứ Sáu. Với task đã lên lịch cho hôm nay còn pending, giữ chuỗi của hôm qua cho đến hết ngày local. Bỏ qua các ngày không có lịch; đứt tại ngày có lịch đầu tiên bị bỏ lỡ. Mỗi ngày hoàn thành tính 1. Streak trên dashboard hiện tại = max current streak theo từng habit (định nghĩa của demo), không phải hợp của các habit.

Ví dụ:
- Habit Thứ Hai-Thứ Sáu, hoàn thành Thứ Năm + Thứ Sáu + Thứ Hai, Thứ Ba hôm nay đang pending -> streak 3.
- Habit Thứ Hai-Thứ Sáu, bỏ lỡ Thứ Năm, hoàn thành Thứ Sáu + Thứ Hai, Thứ Ba pending -> streak 2.
- Habit hằng ngày, hôm qua bị bỏ lỡ, hôm nay pending -> streak 0.
- Một ngày đang pause không phải là session bắt buộc nếu pause event có hiệu lực trước ngày đó.

**Historical schedule contract**: chỉnh sửa chỉ có hiệu lực từ ngày local kế tiếp, schedule version trong quá khứ là bất biến. Pause/resume cần lịch sử lifecycle event có ngày. Backend thật phải giữ lịch sử ngay cả khi goal/habit đã bị archive.

## Journey 66 ngày
`elapsedDays = clamp(today - startDate + 1, 0, durationDays)`. Ngày cuối của journey = startDate + durationDays - 1. Hiển thị tiến độ theo timeline (`elapsedDays / durationDays`) tách biệt với mức độ nỗ lực (`completed scheduled quests / scheduled quests to date`). Không cái nào chứng minh một habit đã hình thành vĩnh viễn.

## Analytics
Với kỳ N=7 hoặc 30 bao gồm cả hôm nay, mỗi ngày trả `scheduled`, `completed`, `xpEarned` từ ledger khớp với quest local date. CompletionRate = round(100*sum(completed)/sum(scheduled)), hoặc 0 nếu không có task nào được lên lịch. Category dùng goal category đã được snapshot lúc tạo quest để biểu đồ cũ không dịch chuyển khi goal bị sửa.

## Bảo mật/bất biến cho backend
- User không thể thay đổi goal/habit/quest của user khác.
- `(user_id, habit_id, scheduled_date)` của quest instance là duy nhất; dùng DB transaction cho state+ledger+projection.
- `GET` chỉ đọc; không cấp XP khi GET hoặc chỉ vì sinh schedule.
- Ngăn race condition bằng row-level locking hoặc conditional transition tương đương.
- Không cho phép bonus XP ngoài ledger hoặc input reward âm.
