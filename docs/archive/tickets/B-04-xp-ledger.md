> **SUPERSEDED** — lưu trữ, không còn là yêu cầu. Xem `docs/archive/SUPERSEDED.md` và `docs/PRODUCT_V1.md`.

# B-04 — Vertical slice Completion & XP Ledger

Mục tiêu: PUT/DELETE completion idempotent, transactional, an toàn với concurrency và cập nhật XP projection.

Bản ghi XP duy nhất `(questId,cycle,eventType)`; locking cho state transition; reward bất biến; tính lại `progress` và `level` từ ledger; chặn tương lai/backdate>7.

Test BẮT BUỘC: hai PUT đồng thời, PUT lặp lại, undo lặp lại, complete-sau-undo, rollback khi inject lỗi DB, mutation chéo user bị từ chối, ranh giới ngưỡng level. API trả `xpAwarded` là delta của mỗi lần gọi.

## Trạng thái (2026-10-16)
Đã triển khai: migration V4 (`quest_instances.cycle`, bảng `xp_transactions` append-only với trigger chặn UPDATE/DELETE, unique `(source_type, source_id, cycle, event_type)`, CHECK dấu của amount khớp loại event), `PUT/DELETE /quests/{habitId}/dates/{date}/completion`, `progress` và `earnedXpToday` tính từ ledger (`SUM(amount)`, level theo công thức DOMAIN_RULES, 5 lĩnh vực).
Cách làm: một transaction cho validation, khóa dòng quest (`SELECT ... FOR UPDATE`), đổi trạng thái và ghi ledger; idempotent theo trạng thái nên request trùng (kể cả đồng thời) trả `xpAwarded=0`; undo hoàn đúng số đã cộng trong cycle đó. Lỗi: 404 (không phải của user), 422 `QUEST_IN_FUTURE` / `QUEST_TOO_OLD` (quá 7 ngày) / `QUEST_OUTSIDE_SCHEDULE` / `VALIDATION_FAILED`, 409 `QUEST_NOT_ACTIVE`.
Kiểm chứng: 68 test backend (thêm 15 integration + 2 unit): 8 PUT đồng thời chỉ cộng một lần, complete/undo đồng thời không lệch ledger, rollback khi trigger gây lỗi (không còn quest hay ledger), complete-sau-undo cycle 2, ranh giới level 399/400/900/1600/2500, mutation chéo user, ledger không sửa/xóa được.
Chưa làm (cố ý): `streak` luôn 0 (B-05), `effects` luôn rỗng (boss/achievement thuộc lớp RPG), boss và achievement chưa có endpoint.
