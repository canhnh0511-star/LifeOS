# Prompt bàn giao Life OS cho coding agent

Đọc `CLAUDE.md` ở cấp repository TRƯỚC. Sau đó đọc theo thứ tự:
1. `docs/PRD.md` và `docs/UI_SPEC.md`
2. `docs/API_CONTRACT.md`, `docs/openapi.yaml` và `frontend/src/api/types.ts`
3. `docs/DOMAIN_RULES.md` và `docs/DATA_MODEL.md`
4. `docs/TEST_PLAN.md`
5. Ticket được chọn trong `docs/tickets/`

**Giai đoạn hiện tại:** review UI, ticket `00_FRONTEND_REVIEW.md`. KHÔNG triển khai backend cho đến khi owner duyệt UI rõ ràng.

Bắt đầu bằng cách chạy `cd frontend && npm install && npm run test && npm run build && npm run dev`. Nếu không có npm, có thể chạy bản preview không phụ thuộc trong `preview/` bằng `python -m http.server 4173`. Xác minh lệnh và kết quả thực tế một cách trung thực.

Triển khai đúng một ticket/vertical slice mỗi lần. Nêu rõ các giả định, sửa code tối thiểu, thêm test, tự review độ tương thích API và race condition của XP/Streak, sau đó tóm tắt các file đã đổi, test đã chạy, rủi ro và hành động tiếp theo. Không bao giờ deploy hoặc chạy SQL phá hủy khi chưa được duyệt rõ ràng.
