> **SUPERSEDED** — lưu trữ, không còn là yêu cầu. Xem `docs/archive/SUPERSEDED.md` và `docs/PRODUCT_V1.md`.

# B-08 — Hạ boss: `PUT/DELETE /bosses/{bossId}/completion`

Trạng thái: **xong** (ADR-028) · Chặn bởi: không (B-04, B-05 đã xong).

Hiện tại: Journey trả boss LOCKED/AVAILABLE theo level lĩnh vực nhưng không bao giờ DEFEATED; huy hiệu chặng luôn `earned=false`; analytics chưa có `completed` cho boss.

Phạm vi (theo `docs/DOMAIN_RULES.md` mục Boss và `.scratch/rpg-campaign/spec.md`):
- Bảng lưu trạng thái boss theo (user, journey, boss code, cycle) và ledger event `BOSS_COMPLETE` / `BOSS_REVERT` (mở rộng CHECK của `xp_transactions`, `source_type='BOSS'`, unique `(source, cycle, event_type)`), cùng một transaction và khoá dòng như quest.
- PUT chỉ khi `AVAILABLE`, boss `LOCKED` trả 409 `BOSS_LOCKED`; idempotent theo trạng thái; DELETE thu hồi XP và huy hiệu; hạ lại sau undo tăng cycle.
- Boss đã DEFEATED giữ trạng thái dù level lĩnh vực tụt sau đó; quy tắc backdate 7 ngày áp dụng cho ngày hạ; `defeatedDate` theo timezone user.
- `Journey.chapters[].boss` có `defeatedDate/defeatedAt`, `badge.earned` suy ra từ DEFEATED; analytics tính `completed` vào `defeatedDate` (đã có chỗ trong `AnalyticsService`); boss không ảnh hưởng streak.
- Contract: `BossMutation` đã có trong `openapi.yaml`/`types.ts`; thêm mã lỗi `BOSS_LOCKED` vào `API_CONTRACT.md` nếu chưa có.

Test bắt buộc: hai PUT đồng thời chỉ cộng một lần; PUT lặp/DELETE lặp; hạ lại sau undo (cycle 2); LOCKED bị từ chối; rollback khi lỗi DB; mutation chéo user; level tụt vẫn giữ DEFEATED; analytics và Journey phản ánh đúng.
