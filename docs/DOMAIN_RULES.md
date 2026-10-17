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
- `xpAwarded` của API = delta ròng của *request này* (gồm cả thay đổi phụ như boss/achievement bị thu hồi hoặc được cấp), không phải reward trong lịch sử. Các thay đổi phụ được liệt kê riêng trong `effects[]`.
- Habit có `xpReward = 0` vẫn đổi được trạng thái nhưng không ghi transaction (ledger không chứa amount 0).

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

## Ledger: loại event
`QUEST_COMPLETE` / `QUEST_REVERT`, `BOSS_COMPLETE` / `BOSS_REVERT`, `ACHIEVEMENT_GRANT` / `ACHIEVEMENT_REVOKE`. Mỗi event ghi `category` (snapshot), nguồn (`sourceType`, `sourceId`), `cycle`, `amount`. Không có XP nào được cộng ngoài ledger. Mọi event revoke/revert là event mới, không sửa hay xóa event cũ.

## Area stats (chỉ số theo lĩnh vực)
- `areaXp[c]` = tổng `amount` của các ledger event có `category = c`.
- `totalXp = Σ areaXp[c]` trên 5 lĩnh vực; level tổng dùng công thức level ở trên với `totalXp`.
- `areaLevel[c] = max(1, floor(sqrt(areaXp[c] / 100)))`, `levelStartXp` và `nextLevelXp` tính cùng cách. Level lĩnh vực thường thấp hơn level tổng vì mỗi lĩnh vực chỉ giữ một phần XP; đây là chủ ý.
- Level có thể giảm khi undo (vì được tính lại từ ledger).

## Campaign và chặng
- Campaign là journey hiện có (mặc định 66 ngày). Chia 4 chặng: ngày 1–7, 8–21, 22–44, 45–66 (tính từ `startDate`).
- Chặng chỉ là mốc hiển thị và chứa boss; không thay đổi lịch quest thường.

## Boss
- Mỗi chặng có đúng một boss lấy từ **danh mục boss** (dữ liệu cấu hình). Thuộc tính: `code`, `name`, `category`, `targetMinutes`, `xpReward` (1..100), `requiredLevel`, `tier` (1..5), `artKey`, `bossDate` (ngày cuối chặng).
- **Trạng thái**: `LOCKED` (level lĩnh vực của boss < `requiredLevel`), `AVAILABLE`, `DEFEATED`. Boss có thể bị đánh lại cho đến hết campaign; thất bại không bị phạt.
- **Hạ boss**: `PUT /bosses/{bossId}/completion` idempotent như quest. Lần đầu ghi `BOSS_COMPLETE` +`xpReward` và cấp huy hiệu chặng (huy hiệu chỉ mang tính trưng bày, không có XP riêng; trạng thái `earned` suy ra từ boss đang `DEFEATED`). Chỉ hạ được khi `AVAILABLE`; boss `LOCKED` trả lỗi `BOSS_LOCKED`.
- **Undo**: `DELETE /bosses/{bossId}/completion` ghi `BOSS_REVERT` −`xpReward` và thu hồi huy hiệu. Hạ lại ghi event mới ở cycle tăng. Quy tắc backdate 7 ngày áp dụng cho ngày hạ.
- **Level tụt sau khi thu hồi**: nếu level lĩnh vực không còn đạt `requiredLevel` của một boss đã hạ thì boss vẫn giữ trạng thái `DEFEATED` (điều kiện chỉ kiểm tra lúc bắt đầu đánh).
- **Tier** suy ra từ `xpReward`: 1 Minion ≤40, 2 Elite 41–55, 3 Champion 56–70, 4 Legend 71–85, 5 Mythic 86–100. UI chọn kích thước, khung, hiệu ứng theo tier.
- **Thống kê**: boss tính 1 `scheduled` vào `bossDate`; `completed` tính vào ngày hạ (`defeatedDate`, local date). Có thể khiến một ngày có `completed > scheduled`. Boss tính vào analytics và radar theo `category` của boss.
- **Streak**: boss không thuộc habit nào nên không làm đứt hay kéo dài streak.

## Achievements
Cấp một lần mỗi campaign, có thưởng XP (10–30), ghi ledger `ACHIEVEMENT_GRANT`.
| code | Điều kiện | XP đề xuất |
|---|---|---|
| `STREAK_7` | Current streak của một habit ≥ 7 scheduled session | 20 |
| `BALANCED` | Cả 5 lĩnh vực có ≥ 1 scheduled và hoàn thành ≥ 60% trong 7 ngày gần nhất | 30 |
| `COMEBACK` | Sau khi một streak ≥ 3 bị đứt, đạt lại 3 scheduled session liên tiếp | 20 |
- **Thu hồi**: sau mỗi mutation (complete/undo quest hoặc boss) hệ thống đánh giá lại các achievement trong cửa sổ có thể sửa (7 ngày). Nếu một achievement đã cấp không còn đúng điều kiện thì ghi `ACHIEVEMENT_REVOKE` bù trừ; đạt lại thì cấp lại ở cycle mới. Ngoài cửa sổ 7 ngày, achievement đã cấp được coi là khóa.
- Ghi lĩnh vực: `STREAK_7` và `COMEBACK` ghi vào lĩnh vực của habit gây ra; `BALANCED` chia đều cho 5 lĩnh vực (30 XP = 5 × 6, mỗi lĩnh vực một event). Đánh giá lại chỉ chạy khi mutation thực sự đổi trạng thái (không chạy cho lần gọi idempotent).
- Mọi cấp/thu hồi nằm trong cùng transaction với mutation gây ra và được trả trong `effects[]`.

## Radar (analytics)
- Trục = 5 lĩnh vực; giá trị = `completed / scheduled` của lĩnh vực trong kỳ (7d hoặc 30d), gồm cả boss.
- Lĩnh vực có `scheduled = 0` trong kỳ là "chưa có dữ liệu" (khác 0%).
- `AnalyticsDto.previous` chứa cùng số liệu của kỳ liền trước (cùng độ dài) để phủ so sánh.

## Lớp RPG phía giao diện (B-25 → B-27, ADR-036)
- **Main Quest** là ưu tiên hiển thị của MỘT nhiệm vụ có lịch trong ngày (ghim thủ công hoặc nhiệm vụ chưa xong đầu tiên). Không phải quest mới, không nhân đôi, không thưởng thêm; ghim không còn hiệu lực khi nhiệm vụ xong.
- **Độ khó** chỉ để hiển thị, suy từ `xpReward`: Dễ 0–20, Vừa 21–40, Khó 41+. Không đổi phần thưởng.
- **Đồng hồ buổi tập và đếm ngược nghỉ** là công cụ cục bộ, không phải bằng chứng hoàn thành: bắt đầu/tạm dừng/hết giờ không hoàn thành nhiệm vụ và không có XP. Chỉ mutation hoàn thành (PUT/DELETE completion, objective) mới đổi XP.
- Tuỳ chọn giảm chuyển động, ghim và đồng hồ lưu trong localStorage của thiết bị, không đồng bộ và không có bí mật.
- **Huy hiệu tập luyện (B-29, ADR-038)** chỉ phản ánh bằng chứng hiện có (buổi đã hoàn thành có danh sách bài, set đã ghi), không lưu, không XP. Hoàn tác buổi hoặc xoá set thì huy hiệu mất tương ứng. **Thống kê set (B-41)** chỉ đọc nhật ký set.
- **Nhật ký set (B-34)** chỉ ghi lại bài đã tập (bài, số set, rep hoặc giây, mức tạ kg). Không cộng XP, không có sự kiện ledger, không đổi streak/rương/thành tựu và không tự hoàn thành nhiệm vụ: hoàn thành vẫn chỉ qua nút xác nhận hoặc checklist (B-17).
