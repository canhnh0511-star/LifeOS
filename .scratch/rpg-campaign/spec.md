# Spec: RPG layer — Radar, Area stats, Campaign/Boss, Achievements

Status: các quyết định thiết kế đã chốt, chờ owner cho phép cập nhật PRD / DOMAIN_RULES / contract. Chưa sửa code.

## Nguồn
Phản hồi review UI-00 của owner: Today ổn nhưng chưa "wow"; Journey khó hiểu, muốn kiểu nhiệm vụ game nhập vai; Insights chỉ để nhìn, không giúp quyết định; tổng thể cần thêm yếu tố game; muốn radar chart tổng quan thay biểu đồ cột.

## Quyết định đã chốt (owner)
1. Radar theo **tỷ lệ hoàn thành** của 5 lĩnh vực, 7d/30d, phủ kỳ trước.
2. Journey thành **Campaign** có chặng (chapter), boss và phần thưởng.
3. Boss là **một nhiệm vụ khó hơn nhiệm vụ hằng ngày**; thưởng **XP + huy hiệu**.
4. Undo nhiệm vụ boss **thu hồi** phần thưởng.
5. Mỗi lĩnh vực có **XP và level riêng**; level tổng tính từ tổng XP = Σ XP 5 lĩnh vực (công thức level hiện tại giữ nguyên).
6. Achievement **có thưởng XP**; ba loại: STREAK_7, BALANCED, COMEBACK.
7. Boss ở **cuối mỗi chặng**, **mở khóa theo level**.
8. Boss **tính vào thống kê** (scheduled / completed / radar).
9. Boss do owner và agent **cùng thiết kế từ đầu** (danh mục boss), bổ sung được về sau.
10. Boss có **hình quái vật**; độ hoành tráng tỷ lệ với độ khó.
11. Không hạ được boss thì **được đánh lại**.
12. Achievement **cấp một lần mỗi campaign**.
13. Hình quái vật tạo bằng **công cụ tạo ảnh AI có sẵn** trong phiên làm việc.
14. Boss hạ muộn: **completed tính vào ngày hạ**, scheduled tính vào `bossDate`.
15. Danh mục boss nháp, số XP, ngưỡng và `requiredLevel` đề xuất bên dưới được **chấp nhận làm giá trị khởi đầu** (chỉnh sau khi thử thực tế).

## Quy tắc đề xuất (cần owner xác nhận, số liệu chỉnh được)

### Area stats
- `areaXp[c]` = tổng amount trong ledger của quest thuộc category c (kể cả boss, achievement gắn lĩnh vực).
- `totalXp = Σ areaXp[c]`. `level` tổng dùng công thức hiện tại trên `totalXp`.
- `areaLevel[c]` dùng cùng công thức `max(1, floor(sqrt(areaXp/100)))`. Do mỗi lĩnh vực chỉ có một phần XP nên level lĩnh vực thường thấp hơn level tổng; đây là hành vi chủ ý.
- Mọi XP event có `category` snapshot.

### Campaign và chặng
- Campaign = journey 66 ngày hiện có. Chia 4 chặng: ngày 1–7, 8–21, 22–44, 45–66.
- Chặng chỉ là mốc hiển thị + chứa boss; không đổi lịch quest thường.

### Boss
- Mỗi chặng có đúng một boss lấy từ **danh mục boss** (xem bên dưới). Boss có `code`, `name`, `category`, `targetMinutes`, `xpReward` (<= 100, theo quy tắc hiện có), `requiredLevel`, `tier` (1–5), `artKey`, `bossDate` (ngày cuối chặng), `status`.
- **Mở khóa theo level** (diễn giải, cần xác nhận): boss mở khi level của lĩnh vực của boss >= `requiredLevel`. Chưa đủ thì boss khóa, hiện còn thiếu bao nhiêu XP. Không còn ngưỡng 70% tiến độ.
- **Đánh lại**: boss không hết hạn trong chặng; có thể thử lại cho đến hết campaign. Thất bại không phạt thêm. (Cách thống kê cho trường hợp đánh muộn: xem câu hỏi mở.)
- **Hạ boss**: PUT completion trên boss; idempotent như quest. Cộng `xpReward` + cấp huy hiệu chặng.
- **Undo** (DELETE): ghi event bù trừ `-xpReward`, thu hồi huy hiệu chặng. Complete lại ghi event mới ở cycle tăng dần (giống ledger quest).
- **Thống kê**: boss tính 1 scheduled vào `bossDate`, tính completed khi hạ. Tính vào analytics và radar theo category của boss.
- **Streak**: boss KHÔNG thuộc habit nào nên không làm đứt hay kéo dài streak. (Hệ quả của quyết định 8: bỏ lỡ boss kéo tụt tỷ lệ hoàn thành và radar nhưng không đứt streak. Cần owner xác nhận.)
- **Ai định nghĩa boss**: owner và agent cùng thiết kế danh mục từ đầu; danh mục là dữ liệu cấu hình (code/JSON), thêm boss mới không cần đổi luật.

#### Độ hoành tráng theo độ khó
Độ khó (`tier`) suy ra từ `xpReward` và `targetMinutes` theo bảng cố định, để hình ảnh luôn khớp độ khó thật. Đề xuất:
| Tier | Tên | xpReward | Hình quái vật |
|---|---|---|---|
| 1 | Minion | <= 40 | Nhỏ, khung đơn giản |
| 2 | Elite | 41–55 | Lớn hơn, viền phát sáng |
| 3 | Champion | 56–70 | Chi tiết hơn, hào quang, nền riêng |
| 4 | Legend | 71–85 | Rất lớn, hiệu ứng động, khung vàng |
| 5 | Mythic | 86–100 | Toàn màn hình, hiệu ứng riêng khi hạ |
Hình ảnh nằm trong danh mục theo `artKey`; UI chọn kích thước, khung và hiệu ứng theo `tier`. Nguồn ảnh: xem câu hỏi mở.

#### Danh mục boss khởi đầu (nháp để cùng chỉnh)
| Chặng | Boss (nháp) | Lĩnh vực | Nhiệm vụ mẫu | Tier |
|---|---|---|---|---|
| 1 (ngày 1–7) | Slime of Inertia | Mindfulness | 60 phút không điện thoại | 1 |
| 2 (ngày 8–21) | Gargoyle of Distraction | Knowledge | 90 phút deep work/đọc liền mạch | 2 |
| 3 (ngày 22–44) | Troll of Burnout | Health | 2 giờ vận động ngoài trời | 3 |
| 4 (ngày 45–66) | Dragon of Procrastination | Career | Hoàn thành một dự án nhỏ | 5 |
Tên, nhiệm vụ, lĩnh vực và tier được chấp nhận làm giá trị khởi đầu.

| Boss | tier | xpReward | requiredLevel (level lĩnh vực) |
|---|---|---|---|
| Slime of Inertia | 1 | 40 | 1 |
| Gargoyle of Distraction | 2 | 50 | 1 |
| Troll of Burnout | 3 | 65 | 2 |
| Dragon of Procrastination | 5 | 100 | 3 |
**Đã chỉnh (owner chấp nhận 2026-10-15):** requiredLevel = 1, 1, 2, 3 vì seed chỉ cho ~30 XP/ngày/lĩnh vực; seed thêm habit Mindfulness. Ghi chú gốc: level lĩnh vực tính bằng `floor(sqrt(areaXp/100))`, nên level 4 cần 1.600 XP trong riêng lĩnh vực đó. Với dữ liệu mẫu (mỗi lĩnh vực chỉ vài trăm XP sau 3 tuần) ngưỡng này sẽ khó đạt trước chặng 4; cần kiểm tra bằng mock và chỉnh `requiredLevel` hoặc hệ số.

### Achievements (có XP)
Mỗi achievement có `code`, `xpReward` nhỏ (10–30), cấp một lần mỗi campaign. Cấp và thu hồi đều ghi ledger.
| code | Điều kiện đề xuất |
|---|---|
| STREAK_7 | Current streak của một habit >= 7 scheduled session |
| BALANCED | Cả 5 lĩnh vực có >=1 scheduled và hoàn thành >= 60% trong 7 ngày gần nhất |
| COMEBACK | Sau khi một streak >= 3 bị đứt, đạt lại 3 scheduled session liên tiếp |
- **Thu hồi**: vì chỉ sửa được 7 ngày gần nhất, nếu undo làm điều kiện không còn đúng trong cửa sổ đó thì ghi event bù trừ `ACHIEVEMENT_REVOKE`. Đạt lại thì cấp lại (cycle mới). Ngoài cửa sổ 7 ngày achievement coi như đã khóa.
- **Rủi ro cần test**: undo một quest có thể thu hồi quest đó, achievement và/hoặc boss cùng lúc; level có thể tụt. Mỗi mutation phải chạy trong một transaction.

### Insights và UI
- Radar chart thay biểu đồ cột làm trực quan chính; lĩnh vực chưa có habit hiện "chưa có dữ liệu", không phải 0%. Bản thu nhỏ trên Today. Có bảng text thay thế.
- Gợi ý heuristic (không AI): lĩnh vực yếu nhất, ngày trong tuần hay bỏ lỡ, so với kỳ trước.
- Journey đổi thành bản đồ chiến dịch: chặng, boss khóa/mở, huy hiệu. Thẻ nhân vật với level tổng + chỉ số 5 lĩnh vực + danh hiệu theo level. Hiệu ứng level-up.

## Ảnh hưởng tài liệu / contract (chưa làm)
- PRD: bỏ "achievements" khỏi Exclusions; thêm yêu cầu F10–F12 (area stats, campaign/boss, achievements).
- DOMAIN_RULES: mục Area stats, Campaign/Boss, Achievements; mở rộng ledger event types (`BOSS_COMPLETE`/`BOSS_REVERT`, `ACHIEVEMENT_GRANT`/`ACHIEVEMENT_REVOKE`); ghi rõ không có XP ẩn: mọi XP đều có event hiển thị.
- DECISIONS: ADR mới cho các điểm trên; xử lý ADR-009 (global streak) vì BALANCED và COMEBACK phụ thuộc định nghĩa streak.
- Contract: `ProgressDto.areas[]`, `CampaignDto`/`ChapterDto`/`BossDto`, `AchievementDto`, endpoint boss completion, `QuestMutationDto` trả thêm các thay đổi phụ (boss/achievement granted/revoked), `AnalyticsDto` thêm số liệu kỳ trước cho radar.
- DATA_MODEL: bảng `campaign_chapters`, `bosses`, `achievements_granted`; `xp_transactions` thêm `category`, event_type mới; sửa `amount <> 0`.

## Phụ thuộc (phải làm trước)
Các lỗi nền tảng đã nêu: ledger thiếu `cycle`/`questId`, lịch sử bị viết lại khi pause (boss và achievement phụ thuộc lịch sử ổn định), `ApiError` chưa chuẩn hóa.

## Quyết định về nguồn ảnh
Ảnh boss tạo bằng công cụ AI có sẵn (hiện có công cụ tạo ảnh trong Figma và Canva), lưu thành asset tĩnh theo `artKey`, một ảnh cho mỗi boss. Cần giữ phong cách đồng nhất: dùng chung một prompt phong cách (art style, bảng màu, góc nhìn) cho cả bộ. Ảnh phải có nền trong suốt hoặc nền đồng bộ để UI đặt khung/hào quang theo tier.

## Câu hỏi mở
1. Ngưỡng `requiredLevel` có đạt được trong thực tế không (xem lưu ý trên); cần thử với mock.
2. Chất lượng và tính đồng nhất của ảnh AI chỉ biết sau khi tạo thử một boss.
3. Bỏ lỡ boss không đứt streak (giữ nguyên đề xuất, chưa có phản đối).
