# B-13 — Hiệu năng và dọn các điểm lệch nhỏ

Trạng thái: **chưa làm** · Ưu tiên thấp, làm khi dữ liệu lớn hoặc khi tiện.

- Streak và Journey hiện đọc toàn bộ quest COMPLETED của user mỗi lần (`StreakService`, `JourneyService`); cần truy vấn theo khoảng ngày hoặc cache có kiểm soát khi số quest lớn. Thêm test hiệu năng nhỏ (ví dụ 2 năm × 5 habit).
- Dashboard gọi `ProgressService` và `JourneyService` (mỗi cái tải lại lịch sử): gộp việc tải `ScheduleHistory` trong một request.
- `PATCH`/`POST` sai kiểu JSON (ví dụ `targetMinutes` là chuỗi) trả 400 `BAD_REQUEST` thay vì 422 `VALIDATION_FAILED` như mock; thống nhất theo contract.
- Giới hạn khoảng ngày của `GET /quests?date=` (ngày quá xa) hoặc ghi rõ là hợp lệ.
- Xác nhận ADR-009 (streak toàn cục) với owner; đang chấp nhận tạm.
