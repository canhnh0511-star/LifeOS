# Life OS — app tập gym kiểu RPG

v1 là ứng dụng tập gym cho người mới hoặc quay lại tập, có vòng tiến triển lấy cảm hứng Solo Leveling: xem buổi tập hôm nay, hiểu bài tập, ghi từng set, hoàn thành nhận XP, xem tiến độ. Chi tiết: [`docs/PRODUCT_V1.md`](docs/PRODUCT_V1.md).

## Chạy và kiểm thử

Frontend (Node LTS), mặc định dùng mock localStorage, không cần backend:

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm test
npm run build
```

Dùng backend thật: đặt `VITE_API_MODE=real` và `VITE_API_BASE_URL=/api/v1` trong `frontend/.env` (xem `frontend/.env.example`). Backend Java 21 + Spring Boot + PostgreSQL: xem [`backend/README.md`](backend/README.md) (`docker-compose.yml` để chạy cục bộ).

## Triển khai

Railway: [`docs/DEPLOY_RAILWAY.md`](docs/DEPLOY_RAILWAY.md). Không deploy hoặc chạy SQL phá huỷ khi chưa được owner duyệt.

## Tài liệu hiện hành

- [`docs/PRODUCT_V1.md`](docs/PRODUCT_V1.md) — mục tiêu, ranh giới, vòng chính
- [`docs/NEXT_STEPS.md`](docs/NEXT_STEPS.md) — việc kế tiếp, có cách kiểm
- [`docs/audit/PHASE0_AUDIT.md`](docs/audit/PHASE0_AUDIT.md) — audit giao diện và ảnh chụp
- [`docs/DOMAIN_RULES.md`](docs/DOMAIN_RULES.md) — XP, streak, timezone
- [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md), [`docs/openapi.yaml`](docs/openapi.yaml), [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md)
- [`docs/agent/DECISIONS.md`](docs/agent/DECISIONS.md) — quyết định kiến trúc (ADR)
- [`docs/tickets/`](docs/tickets/) — ticket gym/RPG B-25 → B-41 và vận hành B-11 → B-13
- [`docs/LifeOS_Gym_Week1_2026-10-19.md`](docs/LifeOS_Gym_Week1_2026-10-19.md) — giáo án tuần 1
- [`docs/archive/`](docs/archive/SUPERSEDED.md) — đã hết hiệu lực, chỉ để tra cứu
