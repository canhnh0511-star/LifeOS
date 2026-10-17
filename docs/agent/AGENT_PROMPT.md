# Bàn giao cho coding agent

1. Đọc `CLAUDE.md`, rồi `docs/PRODUCT_V1.md` (nguồn chân lý), `docs/NEXT_STEPS.md`, `docs/DOMAIN_RULES.md`.
2. Contract: `docs/openapi.yaml` + `frontend/src/api/types.ts` (đổi cả hai cùng lúc). Quyết định: `docs/agent/DECISIONS.md`.
3. Chạy: `cd frontend && npm install && npm test && npm run build && npm run dev`. Backend: `backend/README.md`.
4. Một lát cắt mỗi lần, test trước, báo cáo file đổi + lệnh test thật + known gaps. Không deploy, không chạy SQL phá huỷ, không sửa dữ liệu production khi chưa được owner cho phép rõ.
