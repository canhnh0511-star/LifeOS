# Workflow của agent — Spec → Ticket → Implement → Review

## Giai đoạn A: Review frontend (HIỆN TẠI)
1. Đọc PRD + UI_SPEC + API_CONTRACT.
2. Chạy `cd frontend && npm install && npm run dev`.
3. Kiểm tra trực quan Today/Journey/Insights trên desktop và iPhone.
4. Kiểm thử tương tác và ghi lại screenshot/phản hồi vào checklist duyệt UI.
5. Chỉ sửa frontend; giữ nguyên type contract `LifeOsApi`.
6. Chạy build/test và giải thích các giới hạn.
7. Xin **duyệt UI rõ ràng** trước khi bắt đầu Giai đoạn B.

## Giai đoạn B: Backend vertical slice (SAU KHI DUYỆT)
Xử lý ticket tuần tự. Mỗi ticket một PR. Trước hết làm cho API contract test đạt trên dữ liệu fixture của mock, sau đó triển khai route/service/repository/migration/integration test. Không deploy/migrate trên database hiện có khi chưa được duyệt rõ ràng. Ưu tiên feature package (modular monolith), tránh microservices.

### Prompt đề xuất cho Codex/Claude Code
```
You are implementing Life OS. Read CLAUDE.md, docs/PRD.md,
docs/API_CONTRACT.md, docs/DOMAIN_RULES.md, docs/DATA_MODEL.md,
and the selected docs/tickets/B-XX.md.

FIRST: summarize exact acceptance criteria and any unresolved decisions.
Do not implement unrelated features. Preserve frontend UI and existing DTO shapes.
Implement one vertical slice at a time, with unit and integration tests.
Never run destructive operations against an external database or deploy.
Report changed files, tests actually executed, and unresolved risks.
```

## Sản phẩm bắt buộc từ agent
- Kế hoạch triển khai ticket ngắn gọn và các giả định.
- Code biên dịch được; test đã cập nhật.
- Database migration chỉ cho ticket liên quan sau khi Giai đoạn B bắt đầu.
- Ví dụ contract và các lỗi đã được ghi lại.
- Tự review (gồm concurrency/timezone/ownership khi liên quan).
- Tóm tắt bàn giao, không khẳng định hoàn thành khi chưa xác minh.
