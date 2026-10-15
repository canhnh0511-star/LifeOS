# B-04 — Vertical slice Completion & XP Ledger

Mục tiêu: PUT/DELETE completion idempotent, transactional, an toàn với concurrency và cập nhật XP projection.

Bản ghi XP duy nhất `(questId,cycle,eventType)`; locking cho state transition; reward bất biến; tính lại `progress` và `level` từ ledger; chặn tương lai/backdate>7.

Test BẮT BUỘC: hai PUT đồng thời, PUT lặp lại, undo lặp lại, complete-sau-undo, rollback khi inject lỗi DB, mutation chéo user bị từ chối, ranh giới ngưỡng level. API trả `xpAwarded` là delta của mỗi lần gọi.
