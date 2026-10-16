# B-09 — Achievement: cấp, thu hồi và `effects[]`

Trạng thái: **xong** (ADR-029) · Chặn bởi: B-08 (BALANCED/STREAK_7 đọc cả boss/ledger; nên làm sau).

Hiện tại: `GET /achievements` trả danh mục 3 mục (`STREAK_7`, `BALANCED`, `COMEBACK`), tất cả LOCKED; quest mutation trả `effects: []`.

Phạm vi (theo `docs/DOMAIN_RULES.md` mục Achievements, ADR-014, ADR-020):
- Lưu trạng thái cấp theo (user, campaign, code, cycle); ledger `ACHIEVEMENT_GRANT` / `ACHIEVEMENT_REVOKE`. `STREAK_7` và `COMEBACK` ghi vào lĩnh vực của habit gây ra; `BALANCED` chia 30 XP thành 5 event × 6 để `totalXp = Σ areaXp`.
- Đánh giá lại sau mỗi mutation thực sự đổi trạng thái (không chạy cho lần gọi idempotent), trong cùng transaction; thu hồi chỉ trong cửa sổ sửa 7 ngày; đạt lại thì cấp ở cycle mới; trả trong `effects[]` và cộng vào `xpAwarded`.
- Phụ thuộc ADR-009 (streak toàn cục); STREAK_7 và COMEBACK dùng streak theo từng habit.

Test bắt buộc: cấp đúng một lần mỗi campaign; thu hồi khi undo; cấp lại ở cycle mới; ngoài cửa sổ 7 ngày thì khoá; tổng XP luôn bằng SUM ledger; BALANCED chia đúng 5 event; mutation đồng thời không cấp đôi.
