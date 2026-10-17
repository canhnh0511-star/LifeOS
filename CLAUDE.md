# Life OS — Hướng dẫn cho AI Coding Agent

Bắt đầu với `docs/agent/AGENT_PROMPT.md`. Repository này phát triển theo hướng **contract-first, frontend-first**: các vertical slice nhỏ, ledger XP bất biến (immutable), streak theo scheduled session có xét timezone, và mỗi behavior đều có test.

## Milestone hiện tại: B-35 (Hôm nay kiểu cửa sổ trạng thái) xong; B-01 → B-10, B-15, B-17 → B-22, B-24 → B-28, B-32, B-34, B-35 đã xong (UI-00 đã được duyệt)

**UI-00 được owner duyệt rõ ràng ngày 2026-10-15** ("oke duyệt ticket 00"). Backend (B-01 → B-06) được mở khóa, làm lần lượt từng ticket, bắt đầu từ B-01. Giao diện frontend coi như đã chốt: đổi UI cần owner đồng ý.

- Mã nguồn frontend: `frontend/` (React, TypeScript, Vite PWA).
- Mock backend: `frontend/src/api/mockClient.ts` (localStorage, không có tài khoản thật).
- API contract: `docs/openapi.yaml` và `frontend/src/api/types.ts`. Khi đề xuất đổi contract, phải cập nhật CẢ HAI.
- Quy tắc sản phẩm: `docs/DOMAIN_RULES.md`.
- Ticket: `docs/tickets/00_FRONTEND_REVIEW.md`, sau đó `B-01` đến `B-17`. Ticket còn lại và trạng thái ở `docs/tickets/README.md` (Today kiểu RPG: B-17 xong, B-18 giao diện RPG, B-19 chuỗi ngày và phần thưởng hôm nay; trang bị: B-16).
- Lớp RPG và giai đoạn đầu là app tập gym: đọc `docs/rpg/STATUS.md` trước (ADR-036); ticket B-25 → B-33 ứng với RPG-01 → RPG-08. Ticket kế tiếp: B-36 → B-41 theo ảnh tham chiếu giao diện của owner (xem docs/rpg/STATUS.md; giữ màu xanh hiện tại), B-29/B-30, rồi B-31 (QA + sign-off).
- Ghi lại các đánh đổi kiến trúc trong `docs/agent/DECISIONS.md`.

## Nguyên tắc làm việc

1. Làm từng ticket một, báo cáo scope và các hạng mục loại trừ.
2. Kiểm chứng các hành động người dùng thấy được; không giao control không hoạt động (inert).
3. Ưu tiên automated test tái hiện bug trước khi sửa.
4. Không có bonus XP ẩn, không đổi schedule hồi tố, không đưa production secret vào repository.
5. Dữ liệu cấp ngày dùng timezone của người dùng đã xác thực; instant dùng UTC.
6. Mock API chỉ là mô phỏng, **không** phải production authorization, offline sync hay database đồng thời (concurrent).
7. Báo cáo các thay đổi đã hoàn thành, lệnh test và kết quả, known gaps và bước tiếp theo đề xuất.

## Agent skills

### Issue tracker

Issue và spec là file markdown trong `.scratch/<feature>/`. Ticket của dự án vẫn nằm ở `docs/tickets/`; `.scratch/` chỉ dành cho spec và issue do các skill tạo ra, không đổi thứ tự ticket hay lệnh chặn backend. Xem `docs/agents/issue-tracker.md`.

### Triage labels

Dùng bộ năm label mặc định (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). Xem `docs/agents/triage-labels.md`.

### Domain docs

Single-context: một `CONTEXT.md` và `docs/adr/` ở thư mục gốc repo. Xem `docs/agents/domain.md`.
