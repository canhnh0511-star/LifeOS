# Life OS — Hướng dẫn cho AI Coding Agent

Bắt đầu với `docs/agent/AGENT_PROMPT.md`, rồi `docs/PRODUCT_V1.md` (nguồn chân lý) và `docs/NEXT_STEPS.md`.

**v1 = app tập gym cho người mới, có tiến triển kiểu RPG** (ADR-039). Ưu tiên trải nghiệm tập thật trước hiệu ứng RPG. Không làm tính năng ngoài gym (thói quen tổng quát, tài chính, xã hội...). Tài liệu cũ nằm ở `docs/archive/` và đã hết hiệu lực.

- Frontend: `frontend/` (React, TypeScript, Vite PWA); mock ở `frontend/src/api/mockClient.ts`; backend ở `backend/`.
- Contract: `docs/openapi.yaml` và `frontend/src/api/types.ts` — đổi cả hai cùng lúc. Quy tắc XP/streak: `docs/DOMAIN_RULES.md`. Quyết định: `docs/agent/DECISIONS.md`.
- Giao diện: giữ nền tối + xanh lục hiện tại; đổi bố cục lớn cần owner đồng ý. Ảnh tham chiếu: `docs/reference/`.

## Nguyên tắc làm việc

1. Một lát cắt mỗi lần; báo cáo scope và hạng mục loại trừ.
2. Kiểm chứng hành động người dùng thấy được; không giao control không hoạt động.
3. Có test tái hiện bug trước khi sửa; mỗi behavior có test.
4. XP là ledger bất biến, idempotent; không bonus XP ẩn, không đổi lịch hồi tố, không đưa secret vào repo.
5. Dữ liệu cấp ngày dùng timezone người dùng; instant dùng UTC.
6. Không xoá/sửa dữ liệu người dùng, không deploy, không chạy SQL phá huỷ khi chưa được owner cho phép rõ.
7. Báo cáo: file đã đổi, lệnh test và kết quả thật, known gaps, bước tiếp theo.

## Agent skills

### Issue tracker

Issue và spec là file markdown trong `.scratch/<feature>/`. Ticket của dự án nằm ở `docs/tickets/`; `.scratch/` chỉ dành cho spec và issue do các skill tạo ra. Xem `docs/agents/issue-tracker.md`.

### Triage labels

Dùng bộ năm label mặc định (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). Xem `docs/agents/triage-labels.md`.

### Domain docs

Single-context: một `CONTEXT.md` và `docs/adr/` ở thư mục gốc repo. Xem `docs/agents/domain.md`.
