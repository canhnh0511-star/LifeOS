> **Đã tích hợp vào quy trình chính (2026-10-17).** Đọc `docs/rpg/STATUS.md` trước: ticket RPG-01..08 ứng với `docs/tickets/B-25..B-33`, phạm vi giai đoạn đầu là gym (ADR-036). Nội dung dưới đây là bản gốc của gói, một số chỗ đã lỗi thời.

# LIFE OS — TRẢI NGHIỆM RPG / LẤY CẢM HỨNG TỪ SOLO LEVELING
**Brief triển khai cho agent v1.0 | 16/10/2026 | Trạng thái: Đề xuất — cần duyệt UI**

## 0. Sứ mệnh (đọc đầu tiên)
Nâng cấp **PWA Life OS hiện có** thành một **RPG phát triển bản thân** nguyên bản, lấy cảm hứng từ *cảm giác* của Solo Leveling: cửa sổ trạng thái nhân vật, bảng nhiệm vụ hằng ngày, lên cấp, vật phẩm thẩm mỹ (cosmetic), kho đồ, và các chương hành trình 66 ngày. Hành động thật của người dùng (học, piano, tập thể dục, đọc sách) thúc đẩy tiến trình trong app. **Không sao chép nhân vật gốc, tên cốt truyện, nhãn hiệu, trang phục, vũ khí biểu tượng, tranh cốt truyện hay UI nguyên bản.** Hãy xây dựng bản sắc riêng cho Life OS.

**Không tạo app mới, không thay thế kiến trúc hiện có, không bắt đầu migrate backend.** Làm theo hướng frontend-first, dùng lớp trừu tượng API và mock client sẵn có của app. Chủ dự án phải duyệt UI trực quan trước khi đổi contract backend.

## 1. Bối cảnh hiện tại và nguồn sự thật
- Sản phẩm live để kiểm tra **nếu có trình duyệt tương tác**: https://mylife-os.up.railway.app/#today. Bản deploy có thể khác với mã nguồn đã chia sẻ trước đó. Không khẳng định chức năng production đã được xác minh nếu chưa kiểm thử.
- Trong archive mã nguồn đã chia sẻ trước đó: `frontend/src/App.tsx`, `frontend/src/styles.css`, `frontend/src/api/types.ts`, `frontend/src/api/client.ts`, `frontend/src/api/mockClient.ts`, `frontend/src/domain/rules.ts`.
- Tài liệu chuẩn hiện có: `docs/PRD.md`, `docs/UI_SPEC.md`, `docs/DOMAIN_RULES.md`, `docs/API_CONTRACT.md`, `docs/openapi.yaml`, `AGENTS.md`, `CLAUDE.md`.
- Tài liệu RPG mới nằm ở `docs/rpg/`. Chúng **mở rộng** tài liệu hiện có; khi quy tắc xung đột, theo domain rules hiện có và đánh dấu một quyết định cần chủ dự án duyệt.
- Tham chiếu thiết kế: `docs/rpg/reference/quest-screen-concept.png` chỉ là **concept hình ảnh**, không phải bằng chứng về chức năng đã triển khai, ngày tháng, số liệu đúng hay trạng thái nhất quán.

## 2. Kết quả mong muốn và phong cách
Người dùng nên cảm thấy: **"Mình mở cửa sổ hệ thống → thấy các quest hôm nay → làm việc thật → hoàn thành → nhận XP → mở khóa tiến trình thẩm mỹ."**

- Phong cách: **dark fantasy × năng suất gọn gàng**; card gần đen/xanh navy, xanh holographic và tím tiết chế, vàng huyền thoại chỉ dành cho cột mốc đáng chú ý, typography dễ tiếp cận.
- PWA ưu tiên mobile: layout cỡ iPhone là chính, desktop responsive là phụ; animation chỉ là phần nâng cao tùy chọn và phải tôn trọng reduced motion.
- Mọi tác vụ thiết yếu phải dùng được trên thiết bị cấu hình thấp, bàn phím và trình đọc màn hình.
- Điều hướng chính: `Today | Journey | Hunter | Insights`; Inventory là một mục trong Hunter; Settings truy cập từ profile/menu. Mọi chức năng hiện có vẫn phải truy cập được.

## 3. Sản phẩm bàn giao — phạm vi frontend
1. **Today / Mission Board**: trạng thái người dùng (avatar, level, XP, streak), highlight main quest, danh sách quest hằng ngày theo lịch, quest tùy chọn chỉ khi được mô hình hóa rõ ràng, chi tiết quest, trạng thái, tiến độ, nút hành động.
2. **Luồng quest**: Bắt đầu focus timer (tùy chọn) → xác nhận hoàn thành thủ công → mutation mock API hiện có → toast XP + làm mới state → đường Undo; bản thân timer **không sinh XP**.
3. **Hunter Profile**: bản sắc avatar nguyên bản, tiến hóa thẩm mỹ theo Level, rank/danh hiệu (rõ ràng là thẩm mỹ), chỉ số cá nhân chỉ tính từ hoạt động đã biết hoặc gắn nhãn là mock minh họa.
4. **Inventory / Rewards**: huy hiệu, danh hiệu, di vật (relic), khung thẩm mỹ mang tính xác định (deterministic) và gian trưng bày phần thưởng, trạng thái LOCKED/UNLOCKED/EQUIPPED rõ ràng. Không loot trả phí, không cờ bạc ngẫu nhiên, không phần thưởng production bịa đặt.
5. **Journey**: lịch 66 ngày hiện có hiển thị dưới dạng chương/cột mốc; số ngày đã trôi qua tách biệt với tỷ lệ hoàn thành thực tế.
6. **Bàn giao QA**: ảnh chụp 390px mobile + desktop, kết quả test, changelog, phương án thay thế dễ tiếp cận, và các bổ sung contract backend bị hoãn đã được ghi lại.

## 4. Bất biến domain — KHÔNG ĐƯỢC THAY ĐỔI
- **XP thực** đến từ mutation hoàn thành quest hiện có; PUT idempotent, DELETE bù trừ (compensated), làm lại sau undo, không có XP khi đọc/start/timer.
- **Streak** đếm theo các buổi theo lịch (scheduled sessions) chứ không phải số ngày liên tiếp; không phạt những ngày nghỉ không có lịch.
- **Level** theo `docs/DOMAIN_RULES.md`; cosmetic dựa trên level và **không trao sức mạnh gameplay**.
- **Một main quest là một trong các quest theo lịch hiện có của hôm nay**, được hiển thị nổi bật hơn; KHÔNG ĐƯỢC nhân đôi hay trao thưởng hai lần.
- Một tác vụ tùy chọn chỉ được loại khỏi tỷ lệ hoàn thành bắt buộc **khi sự phân biệt đó được hỗ trợ rõ ràng trong state**. Không lén gắn nhãn lại các tác vụ bắt buộc theo lịch thành tùy chọn.
- Endpoint/DTO hiện có giữ nguyên tương thích trừ khi có đề xuất mở rộng riêng được duyệt.
- Đúng người dùng/timezone: ngày theo lịch tính theo local date trong IANA timezone; timestamp sự kiện dùng UTC.

## 5. Hình ảnh đề xuất và nội dung demo
- Main quest: `Deep Work Spring Boot — 45 phút` (+50 XP, Hard).
- Ví dụ hằng ngày: `Luyện piano — 30 phút` (+35 XP); `Đọc sách — 20 phút` (+20 XP); `Workout — 30 phút` (+40 XP).
- Demo tùy chọn: `Viết journal — 10 phút` (+15 XP) **chỉ trong mock data với đánh dấu optional rõ ràng**.
- Các giai đoạn thẩm mỹ avatar (gợi ý, có thể điều chỉnh): Level 1–4 Initiate, 5–9 Awakened, 10–19 Vanguard, 20–34 Ascendant, 35+ Sovereign. Mỗi giai đoạn giữ **cùng một bản sắc nhân vật** và chỉ đổi trang phục, khung, hào quang (aura) và hiệu ứng.
- Token: nền `#080D19`, surface `#141E31`, xanh hệ thống `#4389FF`, tím bóng tối `#895BEE`, vàng huyền thoại `#F4C45B`, hoàn thành `#33C9A2`.

## 6. Hợp đồng thực thi cho agent
**Trước tiên thực hiện `RPG-00` mà không sửa code.** Kiểm tra repository thực tế và cấu trúc route, kiểm tra build/test baseline, chỉ so sánh với app đã deploy khi có quyền truy cập trình duyệt, chụp ảnh màn hình nếu có thể, liệt kê file bị ảnh hưởng/rủi ro, và đề xuất kế hoạch. Sau đó triển khai đúng **một ticket mỗi vòng lặp** từ `docs/rpg/tickets/`. Không refactor không liên quan. Không deploy hay thay đổi tài khoản/dữ liệu production trừ khi được cho phép riêng.

Mỗi ticket kết thúc bằng: các file đã đổi; ảnh chụp màn hình; output `npm run build` + `npm test` (hoặc lý do không chạy được); các hành vi được hỗ trợ so với bị hoãn; checklist nghiệm thu; đề xuất ticket tiếp theo.

## 7. Nghiệm thu / điều kiện dừng
- Người dùng có thể hoàn thành và undo một quest; trạng thái UI và XP mock thực tế luôn đồng bộ sau khi refresh.
- Refresh trình duyệt không nhân đôi XP hay trao lại vật phẩm; chỉ có quest timer thì không trao gì.
- Ở độ rộng 390px, nội dung đọc được không cần cuộn ngang; nút bấm với tới được; reduced-motion hoạt động.
- Thiết kế avatar nguyên bản (không có nhân vật/vật phẩm/asset bản quyền của Solo Leveling).
- CRUD Goal/Habit hiện có, điều hướng ngày, Analytics, khả năng tiếp cận và cấu hình PWA vẫn hoạt động.
- **Dừng lại chờ chủ dự án duyệt UI trước khi có bất kỳ thay đổi backend/API/schema nào.**

Xem: `docs/rpg/01_PRODUCT_SCOPE.md`, `02_UX_DESIGN.md`, `03_RULES_AND_DATA.md`, `04_QA_CHECKLIST.md`, `05_AGENT_WORKFLOW.md`, và các `tickets/` được đánh số để biết chi tiết.
