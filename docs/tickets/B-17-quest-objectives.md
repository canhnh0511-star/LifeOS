# B-17 — Nhiệm vụ có danh sách mục tiêu (checklist có số lượng)

Trạng thái: **chưa làm** · Lát 1/3 của "Today kiểu RPG" (owner duyệt hướng 2026-10-16) · Cần owner duyệt UI trước khi sửa giao diện.

Yêu cầu của owner: một nhiệm vụ không chỉ là "làm một việc trong X phút" mà có **danh sách việc cần đạt**, mỗi mục có số đã làm / mục tiêu (ví dụ Gym tập chân: Squat 24/40 rep, Lunge 0/30 rep; Uống nước 6/10 cốc). Đơn vị **linh động theo loại nhiệm vụ**.

## Mô hình
- Habit có thể có `objectives[]`: `{id, title, target (số nguyên 1..10000), unit (chuỗi ≤ 20, tự do: "rep", "cốc", "phút", "bước", "trang", "lần"...; rỗng với mục dạng tick), step (bước +/- nhanh, mặc định 1; ví dụ nước 250 ml → target 2500, unit "ml", step 250)}`. Tối đa 20 mục mỗi habit.
- Mục dạng **tick** = `target 1`, không đơn vị (ví dụ "Ghi lại bữa ăn"): hiển thị là ô check, không phải bộ đếm.
- Habit **không có** `objectives` giữ nguyên hành vi hiện tại (một nút tick) = ngầm một mục tick. Không cần migrate dữ liệu cũ.
- Quest instance **chụp (snapshot) danh sách mục tiêu** lúc materialize (giống `xpReward`): đổi `objectives` của habit chỉ áp dụng từ ngày mai (như lịch tuần, ADR-030); ngày đã sống giữ danh sách cũ. Tiến độ lưu theo (quest, objectiveId) → `value`.
- Quest tự **hoàn thành** khi mọi mục đạt `value >= target` (ghi `QUEST_COMPLETE` như hiện nay, một lần, XP không đổi) và tự **hoàn tác** khi một mục tụt dưới mục tiêu (ghi `QUEST_REVERT`, tăng cycle như hiện nay). Không có XP từng phần: không XP ngầm.
- Giá trị tiến độ chỉ đặt tuyệt đối (idempotent), không tăng dần trong request.

## API (đề xuất, owner duyệt trước)
- `Habit`/`CreateHabit`/`PatchHabit`/`ImportHabitPlan` thêm `objectives`.
- `Quest` thêm `objectives: [{id,title,target,unit,step,value}]` (rỗng với habit không có mục).
- `PUT /quests/{habitId}/dates/{date}/objectives/{objectiveId}` body `{value}` → `QuestMutation` (cùng dạng hiện nay, kèm `quest` mới nhất để UI cập nhật). `value` được kẹp 0..target? (quyết định: từ chối >target với 422 hay cho vượt; đề xuất cho phép vượt, tính đủ khi ≥ target.)
- Cửa sổ sửa 7 ngày, `QUEST_OUTSIDE_SCHEDULE`, `QUEST_NOT_ACTIVE`, khoá dòng quest và transaction giống `PUT completion`. `PUT/DELETE completion` cũ: với quest có mục, `PUT` đặt mọi mục = target, `DELETE` đặt mọi mục = 0 (nút "hoàn thành nhanh").
- Achievement/boss: giữ `reconcile` sau mỗi thay đổi trạng thái thật sự (quest chuyển COMPLETED/PENDING), không chạy khi chỉ đổi giá trị mà trạng thái không đổi.

## Giao diện (cần duyệt)
Thẻ nhiệm vụ mở rộng ra danh sách mục: thanh `24/40 rep`, nút `-` `+` (theo `step`), chạm số để nhập tay; mục tick là ô check; nhiệm vụ đạt đủ tự đánh dấu xong kèm hiệu ứng. Nhập kế hoạch bằng JSON (B-15) hỗ trợ `objectives` ngay; giao diện sửa danh sách mục trong app làm ở lát sau.

## Test bắt buộc
Tự hoàn thành đúng một lần; tụt dưới mục tiêu thì hoàn tác (cycle tăng, XP đối soát ledger); idempotent (đặt cùng value hai lần); hai request đồng thời không cộng đôi; đổi `objectives` hôm nay chỉ có hiệu lực từ ngày mai và ngày đã sống giữ snapshot; ngoài cửa sổ 7 ngày / ngoài lịch / pause bị từ chối; mục không thuộc quest → 404; người dùng khác → 404; `PUT completion` cũ vẫn chạy với habit có và không có mục; mock khớp backend.

Loại trừ: XP theo từng mục, đo thập phân (cân nặng, vòng eo thuộc ticket "ghi số đo" riêng), hiệp x rep tách riêng (viết "Squat 4x10" bằng một mục target 40 hoặc bốn mục).
