# Nhật ký quyết định kiến trúc (ADR)

| ID | Trạng thái | Quyết định | Lý do |
|---|---|---|---|
| ADR-001 | Chấp nhận cho frontend | React + TypeScript + Vite PWA | Lặp nhanh và UI mobile cài đặt được |
| ADR-002 | Chấp nhận cho frontend | Adapter `LifeOsApi` mock / HTTP | Phát triển UI trước với contract cố định |
| ADR-003 | Đề xuất cho backend | Java 21, Spring Boot modular monolith, PostgreSQL | Stack quen thuộc, vận hành đơn giản hơn service |
| ADR-004 | Chấp nhận cho demo | Timezone Asia/Ho_Chi_Minh, ISO local date | Tính schedule của habit dễ dự đoán |
| ADR-005 | Chấp nhận cho demo | XP event log và transition idempotent | Không vô tình cộng điểm hai lần |
| ADR-006 | Đề xuất cho backend | Scheduled quest instance bất biến + schedule version | Toàn vẹn analytics lịch sử và XP |
| ADR-007 | Chấp nhận (B-01) | Secure HTTP-only cookie + CSRF token | Tránh token trong localStorage và các bẫy CSRF của cookie |
| ADR-008 | Chấp nhận (2026-10-15) | Credential nội bộ: email + mật khẩu (BCrypt), session cookie `LIFEOS_SESSION` + CSRF double-submit; OAuth để sau, thêm như một cách đăng nhập khác dùng chung session | Owner chọn "user nội bộ trước"; không phụ thuộc dịch vụ ngoài, dễ test |
| ADR-009 | Mở | Ý nghĩa của Streak toàn cục: habit tốt nhất hay mọi ngày có lịch | Demo hiển thị max per-habit streak |
| ADR-010 | Chấp nhận cho demo (thay đổi bởi ADR-018) | Goal bị pause ẩn các quest liên kết; pause habit riêng vẫn được giữ | Tránh complete quest của goal không hoạt động |
| ADR-011 | Chấp nhận | Area stats: XP và level riêng cho mỗi lĩnh vực; `totalXp = Σ areaXp`; level tổng giữ công thức cũ | Chỉ số kiểu nhân vật RPG mà không đổi công thức level |
| ADR-012 | Chấp nhận | Campaign = journey chia 4 chặng; boss lấy từ danh mục cấu hình | Thêm boss mới không cần đổi luật |
| ADR-013 | Chấp nhận | Boss mở khóa theo level của lĩnh vực của boss; đánh lại được; undo thu hồi thưởng | Thử thách rõ ràng, thưởng nhất quán với ledger bất biến |
| ADR-014 | Chấp nhận | Achievement STREAK_7, BALANCED, COMEBACK có thưởng XP, cấp một lần mỗi campaign, thu hồi được trong cửa sổ 7 ngày | Động lực dài hạn; giới hạn thu hồi bằng cửa sổ có thể sửa |
| ADR-015 | Chấp nhận | Boss tính vào thống kê: scheduled ở `bossDate`, completed ở ngày hạ; không ảnh hưởng streak | Số liệu phản ánh nỗ lực mà không làm đứt thói quen vì boss |
| ADR-016 | Chấp nhận | Hình boss là asset tĩnh tạo bằng công cụ AI, theo `artKey`; kích thước/hiệu ứng theo tier | Hình quái vật thực thụ, độ hoành tráng tỷ lệ với độ khó |
| ADR-017 | Chấp nhận | Ledger event có `category`, `sourceType`, `sourceId`; habit `xpReward=0` không ghi transaction | Hỗ trợ area stats và nhiều nguồn XP; giải quyết mâu thuẫn `amount <> 0` |
| ADR-018 | Chấp nhận | Pause/resume goal và habit có hiệu lực từ ngày local kế tiếp, ghi bằng lifecycle event; một hàm duy nhất quyết định quest hợp lệ cho mọi đọc/ghi; cửa sổ sửa là hôm nay và lùi 7 ngày | Lịch sử bất biến (không viết lại analytics/journey/streak), khớp DOMAIN_RULES |
| ADR-019 | Chấp nhận | Mã lỗi thống nhất mock/HTTP (`ApiError` với `status`, `code`, `fields`); 422 cho sai dữ liệu hoặc ngày, 409 cho quest không hoạt động | Frontend xử lý lỗi giống nhau ở cả hai adapter |
| ADR-020 | Chấp nhận | Achievement được đánh giá lại sau mỗi mutation làm đổi trạng thái (quest/boss), không phải sau lần gọi idempotent. STREAK_7 và COMEBACK ghi XP vào lĩnh vực của habit; BALANCED chia đều 6 XP cho mỗi trong 5 lĩnh vực (mỗi lĩnh vực một event ledger) để `totalXp = Σ areaXp` luôn đúng. Thu hồi chỉ khi `earnedDate` còn trong cửa sổ 7 ngày | Không có XP ẩn; undo luôn đối soát được từng event |

ADR-009 (streak toàn cục) vẫn Mở; BALANCED và COMEBACK dùng định nghĩa streak theo từng habit, cần xác nhận lại khi ADR-009 được chốt. Spec chi tiết: `.scratch/rpg-campaign/spec.md`.

Thay đổi các quyết định đã Chấp nhận cần thảo luận rõ ràng trước khi làm việc phá vỡ contract.
| ADR-021 | Chấp nhận (B-01) | Auth: `register/login/logout` + `GET /me`; session Spring Security (HttpSession), cookie HttpOnly/Secure/SameSite=Lax, đổi session id và CSRF token khi đăng nhập; CSRF double-submit (`XSRF-TOKEN` → `X-XSRF-TOKEN`); BCrypt cost 12, mật khẩu 10–72 ký tự; email lowercase unique; request ẩn danh không tạo session; test chạy trên PostgreSQL thật (Testcontainers nếu có Docker, ngược lại embedded Postgres) | Không lưu token trong localStorage; không lộ email nào đã tồn tại qua login (đăng ký vẫn trả EMAIL_TAKEN) |
| ADR-022 | Chấp nhận (B-01) | Backend package-by-feature (`controller/service/repository/model/dto`) + `common/{error,logging}` + `config`; log có `requestId` và `userId` trên mọi dòng, một access line mỗi request, audit event `auth.*`, email chỉ ghi dạng fingerprint, không log secret/query/body; `requestId` trả về qua header và body lỗi | Truy vết được một request từ client tới log mà không rò thông tin nhạy cảm |
| ADR-023 | Chấp nhận (B-02) | Goal/habit lưu ở Postgres; `status` là trạng thái mới nhất, hiệu lực thực tế nằm ở `lifecycle_events` (append-only, từ ngày local kế tiếp); lịch tuần là `habit_schedule_versions` bất biến (bitmask thứ trong tuần); ownership nằm trong mọi truy vấn và id của người khác trả 404; "hôm nay" lấy theo timezone user qua `UserClock` | Lịch sử không bị viết lại; không lộ sự tồn tại của dữ liệu người khác |
| ADR-024 | Chấp nhận (B-03) | Quest được materialize lười khi đọc, chỉ cho ngày đã bắt đầu (≤ hôm nay của user), bằng upsert `ON CONFLICT DO NOTHING`; ngày tương lai chỉ xem trước, không ghi DB; reward/category snapshot ở lần materialize đầu; `QuestRules` là nơi duy nhất quyết định quest tồn tại; `progress` là placeholder đến B-04 | GET không thể làm phình bảng bằng ngày xa, không race khi đọc đồng thời, quá khứ không bị viết lại |
| ADR-025 | Chấp nhận (B-04) | XP chỉ có trong bảng `xp_transactions` append-only (trigger chặn sửa/xóa); không lưu tổng, progress tính lại bằng SUM; mutation quest khóa dòng `quest_instances` trong một transaction, idempotent theo trạng thái; undo hoàn đúng amount của cycle đó | Không thể cộng trùng hay lệch ledger dưới tải đồng thời; lịch sử đối soát được |
