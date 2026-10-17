> **Đã tích hợp vào quy trình chính (2026-10-17).** Đọc `docs/rpg/STATUS.md` trước: ticket RPG-01..08 ứng với `docs/tickets/B-25..B-33`, phạm vi giai đoạn đầu là gym (ADR-036). Nội dung dưới đây là bản gốc của gói, một số chỗ đã lỗi thời.

# Life OS RPG — Gói bàn giao (Handoff Pack) v1.0

Mục đích: một **gói đặc tả thả vào là dùng được (drop-in)**, không phải bản vá thực thi. Đặt thư mục `docs/rpg/` vào **repository Life OS hiện tại** của bạn. Giữ `LIFE_OS_RPG_AGENT_BRIEF.md` ở thư mục gốc repository hoặc dẫn link tới nó trong yêu cầu gửi agent. **Không** ghi đè `AGENTS.md`, `CLAUDE.md`, DTO hay mã runtime hiện có.

## Thứ tự đọc đề xuất (tiết kiệm context)
1. `LIFE_OS_RPG_AGENT_BRIEF.md` — sứ mệnh ngắn gọn và các điều bất khả xâm phạm.
2. `docs/rpg/tickets/RPG-00_BASELINE_AUDIT.md` — tác vụ đầu tiên, không viết code.
3. Chỉ một ticket, cộng với các mục nó tham chiếu rõ ràng.
4. Tài liệu tham khảo sâu chỉ khi cần: `01_PRODUCT_SCOPE.md`, `02_UX_DESIGN.md`, `03_RULES_AND_DATA.md`, `04_QA_CHECKLIST.md`.

## Khởi động trong Claude Code
Từ thư mục gốc repo, chạy `claude` và dán:

> Đọc `LIFE_OS_RPG_AGENT_BRIEF.md` và `docs/rpg/tickets/RPG-00_BASELINE_AUDIT.md`, sau đó kiểm tra `AGENTS.md`, `CLAUDE.md`, API contract và domain rules thực tế của repository. Chỉ thực hiện RPG-00: audit baseline, UI và tích hợp; liệt kê chính xác các file cần đổi, rủi ro và kế hoạch ticket. Không sửa code, không đụng dữ liệu production, không deploy, không khởi động backend. Chờ tôi duyệt thiết kế.

Sau khi review:

> Chỉ triển khai `docs/rpg/tickets/RPG-01_DESIGN_FOUNDATION.md`. Giữ nguyên hành vi API/nghiệp vụ hiện có. Chạy các test và build liên quan; đưa ảnh chụp màn hình trước/sau và báo cáo mọi vấn đề chưa giải quyết.

## Trạng thái phi production
Ảnh concept chỉ là tham chiếu thiết kế, **không phải** ảnh chụp ứng dụng đã deploy. Không có tài khoản thật nào được đăng ký hay kiểm thử cho bản bàn giao này. Agent phải kiểm tra repository hiện tại thực tế; mã nguồn Life OS cũ hơn có thể khác với bản deploy trên Railway.

## Các file trong gói
- `LIFE_OS_RPG_AGENT_BRIEF.md`: brief một file duy nhất.
- `docs/rpg/01_PRODUCT_SCOPE.md`: hành trình người dùng, MVP và những thứ không làm.
- `docs/rpg/02_UX_DESIGN.md`: layout, component, visual token.
- `docs/rpg/03_RULES_AND_DATA.md`: ánh xạ domain, ranh giới mock và contract.
- `docs/rpg/04_QA_CHECKLIST.md`: ma trận test và cổng phát hành.
- `docs/rpg/05_AGENT_WORKFLOW.md`: quy trình triển khai và các prompt.
- `docs/rpg/tickets/`: các hạng mục công việc tuần tự, có phạm vi rõ.
- `docs/rpg/reference/quest-screen-concept.png`: tham chiếu hình ảnh gốc, chỉ mang tính minh họa.
