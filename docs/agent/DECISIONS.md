# Nhật ký quyết định kiến trúc (ADR)

| ID | Trạng thái | Quyết định | Lý do |
|---|---|---|---|
| ADR-001 | Chấp nhận cho frontend | React + TypeScript + Vite PWA | Lặp nhanh và UI mobile cài đặt được |
| ADR-002 | Chấp nhận cho frontend | Adapter `LifeOsApi` mock / HTTP | Phát triển UI trước với contract cố định |
| ADR-003 | Đề xuất cho backend | Java 21, Spring Boot modular monolith, PostgreSQL | Stack quen thuộc, vận hành đơn giản hơn service |
| ADR-004 | Chấp nhận cho demo | Timezone Asia/Ho_Chi_Minh, ISO local date | Tính schedule của habit dễ dự đoán |
| ADR-005 | Chấp nhận cho demo | XP event log và transition idempotent | Không vô tình cộng điểm hai lần |
| ADR-006 | Đề xuất cho backend | Scheduled quest instance bất biến + schedule version | Toàn vẹn analytics lịch sử và XP |
| ADR-007 | Đề xuất cho backend | Secure HTTP-only cookie + CSRF token | Tránh token trong localStorage và các bẫy CSRF của cookie |
| ADR-008 | Mở | Nhà cung cấp credential (local password hay OAuth) | Quyết định trước B-01 |
| ADR-009 | Mở | Ý nghĩa của Streak toàn cục: habit tốt nhất hay mọi ngày có lịch | Demo hiển thị max per-habit streak |
| ADR-010 | Chấp nhận cho demo | Goal bị pause ẩn các quest liên kết; pause habit riêng vẫn được giữ | Tránh complete quest của goal không hoạt động. Lịch sử trong mock chưa bất biến |

Thay đổi các quyết định đã Chấp nhận cần thảo luận rõ ràng trước khi làm việc phá vỡ contract.
