# Quy trình làm việc của Coding Agent — tiết kiệm context và dễ review

## Vì sao chia như vậy
Một brief đầu vào ngắn gọn cùng các spec/ticket riêng biệt giúp tránh nạp cả dự án vào một prompt duy nhất. Skill chỉ nên được gọi khi mục đích của chúng liên quan (lập kế hoạch/triển khai/review) và mặc định không chạy đồng thời.

## Chính sách thực thi
1. `RPG-00`: kiểm tra repo thực, ghi lại baseline và đề xuất kiến trúc, **không chỉnh sửa**.
2. Với mỗi ticket đã duyệt: chỉ kiểm tra các component bị đụng tới + tài liệu liên quan; viết ra trước các thay đổi dự định và tiêu chí nghiệm thu.
3. Triển khai lát cắt nhỏ; không đổi tên/refactor không liên quan; cập nhật test trước/cùng với code.
4. `npm run build`, `npm test`; báo cáo lỗi một cách trung thực. Nếu không có trình duyệt/thiết bị, đừng khẳng định có bằng chứng hình ảnh.
5. Viết báo cáo review ngắn và ảnh chụp màn hình (nếu môi trường test hỗ trợ) trước khi sang bước tiếp theo.
6. Đánh giá lại các khoảng trống API nhưng **không triển khai endpoint server hay DB schema** trước khi chủ sản phẩm chấp nhận UI.
7. Giữ nguyên backend hiện có, dữ liệu tài khoản người dùng, secret và Railway production. Không tạo tài khoản test hay thay đổi production trừ khi được cho phép riêng.

## Prompt: chỉ RPG-00
```text
Read LIFE_OS_RPG_AGENT_BRIEF.md and docs/rpg/tickets/RPG-00_BASELINE_AUDIT.md.
Also read the existing AGENTS.md, CLAUDE.md, docs/DOMAIN_RULES.md,
docs/API_CONTRACT.md, and frontend/src/api/types.ts.
Inspect current source and route/UX structure. Run baseline tests/build where possible.
Produce repo-vs-spec gap analysis, impacted files, UI architecture plan,
and 390px/1440px screenshots if browser available.
Do not edit code, deploy, create accounts, or implement backend.
Stop and ask for UI direction approval.
```

## Prompt: triển khai một ticket
```text
Implement only <TICKET_ID> from docs/rpg/tickets/.
Read the ticket and only referenced files plus relevant source.
Preserve LifeOsApi / DTO / XP / Streak semantics and existing CRUD.
Use mock/UI state for new RPG visuals; do not add backend dependencies.
Provide screenshots, build/test results, diff summary, edge cases and next step.
Do not start the next ticket automatically.
```

## Prompt: review độc lập
```text
Review the diff for <TICKET_ID> against docs/rpg/04_QA_CHECKLIST.md,
existing docs/DOMAIN_RULES.md, API_CONTRACT.md and acceptance criteria.
Prioritize functional regressions, false XP/rewards, accessibility,
PWA behavior and mobile layout. Output severity, file/line and reproduction.
Do not modify code in this review pass.
```

## Các quyết định thiết kế cần báo cáo lên cấp trên
- Mô hình dữ liệu quest optional / mẫu số.
- Nguồn bằng chứng cho việc mở khóa vật phẩm vĩnh viễn.
- Hướng nghệ thuật avatar, có hỗ trợ avatar tùy chỉnh của người dùng hay không.
- Đồng bộ timer đa thiết bị (hoãn), hiệu chỉnh XP sau undo.
- Thay đổi điều hướng có thể làm ẩn các tính năng hiện có.

## Definition of Done cho mỗi ticket
Thay đổi phạm vi được cô lập; app chạy được; có test hoặc có blocker rõ ràng; không có trạng thái thưởng bịa; có ảnh chụp màn hình hoặc giới hạn được nêu trung thực; bước tiếp theo được chủ dự án duyệt.
