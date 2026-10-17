> **SUPERSEDED** — lưu trữ, không còn là yêu cầu. Xem `docs/archive/SUPERSEDED.md` và `docs/PRODUCT_V1.md`.

# Life OS — PRD v1.0

## Mục tiêu sản phẩm
PWA ưu tiên một người dùng (single-user-first), biến các mục tiêu dài hạn thành những hành động hằng ngày có lịch và đo lường được. Tạo động lực bằng experience point (XP) và một journey 66 ngày, kèm analytics phân biệt nỗ lực thực sự với việc chỉ để ngày trôi qua.

## Persona và bối cảnh
Người dùng chính: lập trình viên học Java/AI, tập piano, đọc sách và tập thể dục. Dùng laptop khi làm việc và iPhone suốt cả ngày. UI mặc định tiếng Việt, kèm một số nhãn RPG tiếng Anh. Timezone: `Asia/Ho_Chi_Minh`.

## Phạm vi MVP
| ID | Yêu cầu | Tiêu chí chấp nhận |
|---|---|---|
| F01 | Tài khoản cá nhân | Auth context luôn ánh xạ mutation về một user; demo dùng mock identity |
| F02 | Goals | Tạo / liệt kê / pause / resume, phân loại theo lĩnh vực cuộc sống |
| F03 | Habits | Gắn với goal, lên lịch theo ISO weekday, thời lượng, XP reward |
| F04 | Daily quests | Sinh các task theo lịch cho một local date được chọn |
| F05 | Completion | Complete / undo idempotent; không complete được ngày tương lai, cho phép backdate 7 ngày |
| F06 | Gamification | XP ledger, level được tính, current streak theo scheduled session của từng habit |
| F07 | Journey | Hiển thị số ngày đã trôi qua và tách riêng tỷ lệ hoàn thành |
| F08 | Analytics | Số lượng theo ngày trong 7/30 ngày gần nhất, XP kiếm được, category |
| F09 | PWA | Manifest cài đặt được, responsive, app shell cache, HTTPS trên production |
| F10 | Area stats | Mỗi lĩnh vực có XP và level riêng; tổng XP = tổng XP 5 lĩnh vực; level tổng tính từ tổng XP |
| F11 | Campaign và Boss | Journey chia chặng; mỗi chặng có boss (nhiệm vụ khó), mở khóa theo level lĩnh vực, đánh lại được, thưởng XP + huy hiệu, undo thu hồi thưởng |
| F12 | Achievements | STREAK_7, BALANCED, COMEBACK; có thưởng XP, cấp một lần mỗi campaign, thu hồi được khi undo trong cửa sổ 7 ngày |
| F13 | Radar chart | Radar 5 lĩnh vực theo tỷ lệ hoàn thành 7/30 ngày, so sánh kỳ trước |

## Hạng mục loại trừ
AI Coach, native mobile, social leaderboard, thanh toán, push, offline mutation queue, chỉnh sửa schedule tùy ý, tích hợp Apple Health, tài khoản multi-tenant enterprise.

## Tiêu chí chấp nhận theo màn hình
- Today: ngày được chọn, level bar, XP, scheduled quests, tiến độ, streak, radar thu nhỏ, thẻ nhân vật (level tổng + chỉ số 5 lĩnh vực).
- Journey: bản đồ campaign 66 ngày chia chặng, boss khóa/mở/đã hạ kèm hình quái vật, huy hiệu, goal card kèm habit, tạo goal và habit, pause/resume, hai metric của 66 ngày.
- Insights: radar 5 lĩnh vực 7/30 ngày kèm kỳ trước, biểu đồ theo ngày, tổng XP, gợi ý hành động theo heuristic (lĩnh vực yếu nhất, ngày hay bỏ lỡ, so với kỳ trước). Không có phản hồi từ AI.
- Settings: reset/export mock và hiển thị chế độ đang chạy.

## Hành vi UX
- Mọi hành động chính là button có phản hồi loading/error.
- Không bao giờ hiển thị XP tăng hai lần cho cùng một completion; undo trả XP âm bù trừ.
- Quest chưa hoàn thành của hôm nay không được làm đứt streak sớm; cuối tuần không có lịch không thể làm đứt streak ngày làm việc.
- Đổi tab không làm mất dữ liệu đã lưu.
- Không coi thời gian journey trôi qua là thành tích.
- Mọi XP đều hiển thị được từ một ledger event; không có bonus XP ẩn. Mỗi lần hạ boss hoặc đạt/mất achievement phải hiển thị rõ thay đổi XP.
- Độ hoành tráng của hình boss tỷ lệ với độ khó (tier) của nhiệm vụ.

## Mục tiêu phi chức năng (là mục tiêu, không phải số liệu đã kiểm chứng)
- Responsive từ 320px đến 1440px, điều hướng được bằng bàn phím, thân thiện cảm ứng.
- API p95 dưới 500 ms với dữ liệu cá nhân thông thường (cần load test trên backend thật).
- Trạng thái backend lưu bền vững dưới atomic transaction, authorization theo từng user, backup, restore drill.
- Production authentication, HTTPS, cấu hình secure cookie, CORS policy.

## Release gate
Người thật review UI và các flow trước khi triển khai backend. Phản hồi của người dùng có thể đổi field/status rule; cập nhật API contract và ticket trước khi viết backend.
