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
| ADR-011 | Chấp nhận | Area stats: XP và level riêng cho mỗi lĩnh vực; `totalXp = Σ areaXp`; level tổng giữ công thức cũ | Chỉ số kiểu nhân vật RPG mà không đổi công thức level |
| ADR-012 | Chấp nhận | Campaign = journey chia 4 chặng; boss lấy từ danh mục cấu hình | Thêm boss mới không cần đổi luật |
| ADR-013 | Chấp nhận | Boss mở khóa theo level của lĩnh vực của boss; đánh lại được; undo thu hồi thưởng | Thử thách rõ ràng, thưởng nhất quán với ledger bất biến |
| ADR-014 | Chấp nhận | Achievement STREAK_7, BALANCED, COMEBACK có thưởng XP, cấp một lần mỗi campaign, thu hồi được trong cửa sổ 7 ngày | Động lực dài hạn; giới hạn thu hồi bằng cửa sổ có thể sửa |
| ADR-015 | Chấp nhận | Boss tính vào thống kê: scheduled ở `bossDate`, completed ở ngày hạ; không ảnh hưởng streak | Số liệu phản ánh nỗ lực mà không làm đứt thói quen vì boss |
| ADR-016 | Chấp nhận | Hình boss là asset tĩnh tạo bằng công cụ AI, theo `artKey`; kích thước/hiệu ứng theo tier | Hình quái vật thực thụ, độ hoành tráng tỷ lệ với độ khó |
| ADR-017 | Chấp nhận | Ledger event có `category`, `sourceType`, `sourceId`; habit `xpReward=0` không ghi transaction | Hỗ trợ area stats và nhiều nguồn XP; giải quyết mâu thuẫn `amount <> 0` |

ADR-009 (streak toàn cục) vẫn Mở; BALANCED và COMEBACK dùng định nghĩa streak theo từng habit, cần xác nhận lại khi ADR-009 được chốt. Spec chi tiết: `.scratch/rpg-campaign/spec.md`.

Thay đổi các quyết định đã Chấp nhận cần thảo luận rõ ràng trước khi làm việc phá vỡ contract.
