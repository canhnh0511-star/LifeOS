# Báo cáo dọn tài liệu — Phase 0

**Đã thực hiện (owner duyệt 2026-10-17), chưa commit:** `git mv` các mục ARCHIVE (bảng dưới) vào `docs/archive/` kèm banner SUPERSEDED; `docs/rpg/` (owner xác nhận chủ ý xoá) giữ lại duy nhất `reference/` → `docs/reference/`; viết lại `README.md`, `CLAUDE.md`, `docs/agent/AGENT_PROMPT.md`; `docs/agent/WORKFLOW.md` → `docs/archive/WORKFLOW_OLD.md`; `docs/tickets/README.md` → `docs/NEXT_STEPS.md` (bản cũ ở `docs/archive/tickets/README_OLD.md`); thêm ADR-039. **Chưa làm:** `docs/DOMAIN_RULES.md`/`API_CONTRACT.md` giữ nguyên; `tsconfig.tsbuildinfo` vẫn bị track; bộ nhớ agent ngoài repo chưa sửa; `docs/UX_FLOWS.md`/`TECH_NOTES.md` chưa tạo (chờ có nội dung thật). Bảng dưới là phân loại gốc.

## Phát hiện cần owner biết trước

- (Đã giải quyết: owner xác nhận chủ ý) **`docs/rpg/` (21 file, gồm `STATUS.md` và ảnh tham chiếu `quest-screen-concept.png`) đang bị xoá trong working tree** (`git status`: ` D`), xảy ra trong phiên này; agent không chạy lệnh xoá nào. Còn nguyên trong HEAD `fc3f036`, khôi phục bằng `git restore docs/rpg`. Báo cáo này coi như đó có thể là ý owner; nếu không, khôi phục trước khi làm tiếp. Ảnh tham chiếu giao diện của owner (10 màn) nằm trong nhóm này — **không nên xoá** nếu B-36 → B-41 còn dùng.
- `docs/LIFE_OS_SOLO_LEVELING_GYM_REFOCUS.md` chưa được track (file brief của owner) — không động tới.
- `frontend/tsconfig.tsbuildinfo` là file sinh ra bị track (đổi sau mỗi build) — nên bỏ khỏi git và thêm vào `.gitignore`; để owner quyết.
- `README.md` đã lỗi thời: nói "chưa có backend production", "thư mục `preview/`" (không tồn tại), "chưa thể xác nhận npm run build" (backend, build, 259+200 test đã chạy theo STATUS cũ).

## Phân loại

| Mục | Quyết định | Lý do (1 dòng) |
|---|---|---|
| `.env.example`, `docker-compose.yml`, `Dockerfile`, `railway.json`, `.github/`, `backend/**`, migrations | KEEP | Cấu hình/triển khai/migration — ngoài phạm vi dọn dẹp |
| `docs/DEPLOY_RAILWAY.md`, `backend/README.md` | KEEP | Runbook triển khai |
| `docs/openapi.yaml`, `docs/API_CONTRACT.md`, `docs/DATA_MODEL.md`, `docs/DOMAIN_RULES.md` | KEEP (cắt gọn sau) | Hợp đồng/bất biến XP–streak còn hiệu lực; chưa ghi rõ phần "life tổng quát" để rút gọn ở Phase sau |
| `docs/LifeOS_Gym_Week1_2026-10-19.{md,json,csv,xlsx}` | KEEP | Giáo án gym thật của owner; json là nguồn seed |
| `docs/seed/weight-loss-30d.json` | KEEP | Dữ liệu seed, chưa rõ dùng ở đâu — hỏi owner, không đụng |
| `docs/audit/` | KEEP | Bằng chứng Phase 0 |
| `README.md` | REWRITE | Lỗi thời; thành: chạy/test/deploy + v1 là gì + trỏ tới docs hiện hành |
| `CLAUDE.md` | REWRITE (cần owner duyệt) | Còn "UI-00 / chặn backend / B-35" và hướng "Life OS tổng quát"; đổi thành con trỏ ngắn tới `PRODUCT_V1.md` giữ các bất biến (XP bất biến, timezone, test trước) |
| `docs/agent/AGENT_PROMPT.md` | REWRITE | Vẫn nói "KHÔNG triển khai backend", mâu thuẫn thực tế |
| `docs/agent/WORKFLOW.md` | KEEP → xem lại | Chưa đọc kỹ; kiểm mâu thuẫn trước khi sửa |
| `docs/PRD.md`, `docs/UI_SPEC.md`, `docs/TEST_PLAN.md`, `docs/QA_STATUS.md` | ARCHIVE | Viết cho "Life OS thói quen tổng quát" và giai đoạn duyệt UI-00; thay bằng `PRODUCT_V1.md`/`UX_FLOWS.md`. Lịch sử còn trong git |
| `docs/tickets/00_FRONTEND_REVIEW.md`, `B-01…B-24` | ARCHIVE (nhóm đã xong) | Đã hoàn tất; giữ ID để ADR còn tham chiếu — chuyển vào `docs/archive/tickets/` và sửa link |
| `docs/tickets/B-14`, `B-23`, `B-12/B-13/B-11` (chưa làm) | ARCHIVE kèm banner "Hoãn/ngoài v1" | Per-stat quest, random encounter là life-RPG tổng quát; B-11–13 vận hành, giữ nếu sắp deploy thật |
| `docs/tickets/B-25…B-41` | KEEP | Là việc gym/RPG đang làm; B-36 → B-41 bám ảnh tham chiếu của owner |
| `docs/tickets/README.md` | REWRITE | Thành `docs/NEXT_STEPS.md` theo Phase 1–3 của brief |
| `docs/agent/DECISIONS.md` | KEEP + đánh dấu | Giữ ADR; thêm ADR-039 "v1 = gym" và đánh dấu Superseded cho ADR về per-stat/life tổng quát (ADR-011/012/031…) nếu owner đồng ý |
| `docs/agents/*` (issue-tracker, triage-labels, domain) | KEEP | Cấu hình skill, không phải spec sản phẩm |
| `.scratch/rpg-campaign/spec.md`, `.scratch/foundation/…` | ARCHIVE | Spec campaign/boss — life tổng quát |
| `docs/rpg/*` (đang bị xoá trong working tree) | ARCHIVE phần ý tưởng; **KEEP** `reference/*` ảnh | Gói handoff "app v0.1" đã lệch repo (chính STATUS.md nói vậy). Nội dung hữu ích duy nhất: kết quả QA đa màn hình (ghi lại vào `UX_FLOWS.md` trước khi bỏ) |
| Bộ nhớ agent (`~/.claude/.../memory`) `per-stat-quest-generation` | CẬP NHẬT | Trái hướng v1; ngoài repo nên chỉ làm khi owner đồng ý |

## Tài liệu mới đề xuất (theo brief §7)

`docs/PRODUCT_V1.md` (đã tạo bản đầu), `docs/UX_FLOWS.md`, `docs/TECH_NOTES.md`, `docs/NEXT_STEPS.md`, rút `docs/DECISIONS.md` từ ADR hiện hành. Chỉ tạo khi có nội dung thật (UX_FLOWS sau Phase 1).

## Cần owner trả lời

1. `docs/rpg/` bị xoá là chủ ý hay không? (khôi phục hay chốt xoá, giữ riêng ảnh tham chiếu)
2. Duyệt cho phép `git mv` các mục ARCHIVE vào `docs/archive/` (kèm banner SUPERSEDED) và viết lại README/CLAUDE.md/AGENT_PROMPT.
3. Tài khoản test để audit bản deploy thật.
