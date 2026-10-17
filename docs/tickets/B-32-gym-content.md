# B-32 — Nội dung gym: giáo án mẫu, thư viện bài tập, nạp giáo án

Trạng thái: **xong** (2026-10-17; owner chốt hướng: theo đề xuất) · Chỉ frontend, không đổi contract · Nguồn: `docs/rpg/NOTE_PHAM_VI_GYM_GIAI_DOAN_DAU.md` · ADR-036.

Quyết định: giáo án **lịch cố định theo thứ** (khớp "không đổi lịch hồi tố"); thư viện bài tập là **dữ liệu tĩnh ở frontend**; mỗi nhóm cơ là goal/habit có lịch; buổi tập hằng ngày = quest; bài tập = checklist của quest (B-17); ghi từng set/rep là **B-34**.

Phạm vi:
- `domain/exerciseLibrary.ts`: bài tập theo nhóm cơ (Ngực, Lưng, Chân, Vai, Tay, Bụng) + vài giáo án mẫu (ví dụ chia 3–5 buổi/tuần) dựng thành `ImportHabitPlanRequest` (B-15, `POST /habits/import` đã có; mẫu tham khảo `docs/seed/`).
- UI "Nạp giáo án mẫu" (B-15 chưa có UI): chọn giáo án + ngày bắt đầu, xem trước, xác nhận; lỗi API hiển thị rõ.
- Mỗi bài tập thành một mục checklist (tên + số set × rep mục tiêu, `step`), mapping vào lĩnh vực HEALTH.
- Test: giáo án sinh đúng request (thứ trong tuần, không trùng nhóm cơ trong cùng ngày, không vượt giới hạn contract), UI không gọi API khi chưa xác nhận.
- Ngoài phạm vi: ghi từng set/rep/mức tạ (B-34), gợi ý tự động theo tiến bộ, video hướng dẫn.

## Đã làm
- `domain/exerciseLibrary.ts`: 27 bài tập, 6 nhóm cơ; 3 giáo án (Đẩy/Kéo/Chân 3 buổi, Chia nhóm cơ 5 buổi, Toàn thân 3 buổi); `planRequest()` dựng `ImportHabitPlanRequest`: một goal HEALTH "Gym — {giáo án}", mỗi buổi là một habit 60 phút, +50 XP, lịch cố định theo thứ, mỗi bài là một mục checklist (target = số set × rep, step = rep, nên một lần chạm = một set; Plank tính giây).
- `components/PlanImportForm.tsx` + modal "Nạp giáo án gym" (nút ở trạng thái trống của Hôm nay và ở trang Hành trình): chọn giáo án, ngày bắt đầu, xem trước đầy đủ, chỉ gọi `importHabitPlan` khi bấm xác nhận; lỗi (ví dụ 409 đã nạp) hiện qua toast.
- Test: dữ liệu giáo án khớp contract (độ dài, giới hạn, thứ không trùng, còn ngày nghỉ, nhóm cơ khai báo đúng bài tập), form không gọi API trước khi xác nhận, mock chấp nhận cả 3 giáo án và từ chối nạp lần hai.
- Tên bài tập là tên chuẩn dùng cho nhật ký set của B-34 (owner chọn: tên chọn từ thư viện).
- Chưa làm: thêm/sửa/xoá bài tập trong buổi từ giao diện (có thể dùng form sửa thói quen có sẵn), giáo án tự tạo, kiểm bằng mắt ở 390px, thử qua backend thật (mock đã kiểm; backend đã có endpoint, B-15).

## Giáo án "Tuần 1 — quay lại tập" (từ `docs/LifeOS_Gym_Week1_2026-10-19.md`, thêm 2026-10-17)
- Là giáo án đầu tiên trong danh sách: 3 buổi toàn thân thứ 2/4/6, 45 phút, **+40 XP khi xác nhận hoàn thành cả buổi**, mỗi buổi 5 bài × 2 set (không XP theo từng set, không XP khi nạp). Thêm 8 bài tập (máy ép ngực, goblet squat, leg curl/extension, dead bug…) và cơ chế `overrides` để một giáo án ghi set/rep riêng.
- Khoảng rep "10–12" được lưu thành mục tiêu theo cận dưới (10) để buổi nhẹ tuần đầu không bị ép; làm nhiều hơn vẫn được ghi.
- **Ngày hồi phục (thứ 3/5/7) và nghỉ (chủ nhật) không tạo habit**: state chưa có khái niệm nhiệm vụ tuỳ chọn, và một habit 0 XP sẽ tính vào tỉ lệ hoàn thành/chuỗi ngày, trái với "không tính là bỏ lỡ". Hướng dẫn nằm trong mô tả mục tiêu. Nếu muốn hiện cả ngày đi bộ thì cần ticket "nhiệm vụ tuỳ chọn" riêng.
- Đã đối chiếu với `docs/LifeOS_Gym_Week1_2026-10-19.json` (và `.csv`) do owner bổ sung: bài tập, thứ tự, số set, 45 phút, 40 XP khớp; ngày hồi phục/nghỉ có `isScheduledForStreak: false` nên không tạo habit là đúng. Thêm **thời gian nghỉ theo bài** (60/75/90 giây) vào thư viện; màn chi tiết nhiệm vụ hiện nút "Nghỉ N giây · {bài kế tiếp}" cho bài chưa xong đầu tiên nếu tên khớp thư viện (`exerciseByName`); nút này chỉ chạy đếm ngược.
- Chưa dùng từ JSON: `planId` làm khoá chống trùng (hiện chống trùng bằng tên mục tiêu, API trả 409), RIR/ghi chú kỹ thuật từng bài, thiết bị, `weightKg`, import trực tiếp tệp `.json` (giáo án đã được nhập thành dữ liệu trong `exerciseLibrary.ts`, không đọc tệp lúc chạy), kiểm bằng mắt ở 390px, thử với backend thật.
