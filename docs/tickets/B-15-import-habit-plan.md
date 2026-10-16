# B-15 — Nhập kế hoạch thói quen hàng loạt

Trạng thái: **xong phần API** (ADR-029) · Yêu cầu bởi owner 2026-10-16 · Chặn bởi: không · Chưa có UI.

Mục tiêu: nạp nhanh một bộ goal và thói quen hằng ngày (ví dụ kế hoạch giảm cân 30 ngày) thay vì tạo từng habit bằng tay.

Phạm vi: `POST /imports/habit-plans` (atomic, tối đa 10 goal và 50 habit, validate như `POST /goals` và `POST /habits`, 409 `PLAN_ALREADY_IMPORTED` khi trùng tên goal ACTIVE); cập nhật `docs/openapi.yaml`, `docs/API_CONTRACT.md`, `frontend/src/api/types.ts`, `client.ts`, `httpClient.ts`, `mockClient.ts` (giữ parity).

Test: `backend/.../importer/HabitPlanImportIntegrationTest` (tạo đủ goal/habit/lịch, rollback toàn bộ khi một habit sai, giới hạn kích thước, nhập lặp là 409, user khác không thấy dữ liệu, quest sinh ra và nhận XP) và nhóm `mock importHabitPlan` trong `mockClient.test.ts`.

Loại trừ: nút hoặc màn hình import (UI đã khóa, cần owner duyệt); theo dõi số lít/bước/kcal/cân nặng thật (app chỉ có `targetMinutes` và hoàn thành đúng/sai); sinh quest theo chỉ số (B-14).

## Cách dùng
Gửi `POST /imports/habit-plans` với cookie session và header `X-XSRF-TOKEN` (cookie `XSRF-TOKEN`). `startDate` không được là quá khứ. Gửi lại cùng kế hoạch sẽ nhận 409. Dữ liệu mẫu không được lưu trong repo theo yêu cầu của owner.

## Lưu ý sức khỏe của bộ mẫu
Mục tiêu 85 → ~82 kg trong 30 ngày (0,5–1 kg/tuần) và mức ~1.700–1.900 kcal chỉ là ước tính tham khảo cho người trưởng thành khỏe mạnh; nên hỏi bác sĩ hoặc chuyên gia dinh dưỡng nếu có bệnh nền.
