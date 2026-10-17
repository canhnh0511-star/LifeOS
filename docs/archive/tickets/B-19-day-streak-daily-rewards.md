> **SUPERSEDED** — lưu trữ, không còn là yêu cầu. Xem `docs/archive/SUPERSEDED.md` và `docs/PRODUCT_V1.md`.

# B-19 — Chuỗi ngày và "Phần thưởng hôm nay" (rương theo số nhiệm vụ)

Trạng thái: **xong** (huy hiệu "Ngày trọn vẹn" chưa làm; mốc đổi do thêm/pause habit trong ngày chỉ cập nhật ở lần mutation kế tiếp của ngày đó — ADR-033) · Lát 3/3 · Cần owner duyệt UI/contract · Phụ thuộc B-17 (nên làm sau) và giải quyết ADR-009.

## Chuỗi ngày (owner chọn phương án b, 2026-10-16)
Một ngày được tính vào chuỗi khi người dùng đạt **mốc rương đầu tiên (>= 50% nhiệm vụ đã lên lịch của ngày đó)**. Ngày không có nhiệm vụ nào (không lịch, tất cả pause) **bỏ qua**, không làm đứt chuỗi; hôm nay chưa đủ 50% thì chuỗi giữ nguyên (chưa đứt) như quy tắc streak hiện tại. Tính từ lịch sử mỗi lần đọc, không lưu (như ADR-026); theo timezone người dùng. Header hiển thị "12 ngày liên tục". Streak theo từng habit (phiên) vẫn giữ cho STREAK_7/COMEBACK. Ghi ADR thay/bổ sung ADR-009.

## Phần thưởng hôm nay (owner chấp nhận đề xuất, có thể chỉnh)
Ba rương theo tỉ lệ nhiệm vụ hoàn thành trong ngày: **50% = Rương gỗ +10 XP; 80% = Rương bạc +20 XP; 100% = Rương vàng +40 XP + huy hiệu "Ngày trọn vẹn"**. Làm tròn lên (ví dụ 4 nhiệm vụ: 2 / 4 / 4). Ngày không có nhiệm vụ không có rương.
- Mỗi rương là một **sự kiện ledger** (`DAILY_REWARD_GRANT` / `DAILY_REWARD_REVOKE`, `source_type='DAILY'`, theo (user, ngày, mốc)), cấp tự động khi đạt mốc, **thu hồi khi hoàn tác làm tụt dưới mốc** trong cửa sổ sửa 7 ngày, cùng transaction và khoá như achievement (ADR-029); trả trong `effects[]` và cộng vào `xpAwarded`. XP gắn vào lĩnh vực: chia đều 5 lĩnh vực như BALANCED (+10 = 2 mỗi lĩnh vực; +20 = 4; +40 = 8), để `totalXp = Σ areaXp`.
- Không hiển thị phần thưởng khi nó chưa thực sự được cấp bởi backend (không control giả).
- Huy hiệu "Ngày trọn vẹn" lưu như thành tựu (hiển thị trong danh sách thành tựu). Vật phẩm trong rương (trang bị...) thuộc B-16.
- API: `GET /dashboard/today` (hoặc `?date=`) thêm `dailyRewards: [{tier, threshold, xp, state: LOCKED|EARNED}]` và `dayStreak`; `QuestMutation.effects` thêm loại `DAILY_REWARD_GRANTED/REVOKED`.

## Giao diện
Khối "Phần thưởng hôm nay" với ba rương (khoá / đã mở), thanh tiến độ tới mốc kế ("còn 1 nhiệm vụ để mở Rương bạc"), hiệu ứng mở rương nhẹ, tôn trọng reduced-motion; header Hôm nay hiển thị chuỗi ngày thật.

## Test bắt buộc
Cấp đúng một lần mỗi mốc/ngày; thu hồi khi undo (trong cửa sổ 7 ngày), ngoài cửa sổ thì khoá; làm tròn mốc đúng với 1..10 nhiệm vụ; ngày không nhiệm vụ không có rương và không đứt chuỗi; nhiệm vụ thêm/pause trong ngày làm đổi mốc thế nào (mốc theo lịch hiệu lực của ngày); đồng thời không cấp đôi; `totalXp = Σ areaXp = SUM(ledger)`; chuỗi ngày qua nhiều ngày, qua ngày nghỉ và theo timezone.
