# Việc kế tiếp (v1 = tập gym)

Nguồn: `docs/LIFE_OS_SOLO_LEVELING_GYM_REFOCUS.md` §8–9; bằng chứng: `docs/audit/PHASE0_AUDIT.md`. Ticket cũ còn hiệu lực: `docs/tickets/` (B-25 → B-41, B-11 → B-13).

**Cập nhật (owner 2026-10-18):** màn tập là ngoại lệ của nguyên tắc dưới đây: "Tập từng set" mở màn hình riêng (toàn màn hình), từng bước một: set → nghỉ → set tiếp theo → tổng kết, đồng hồ buổi tập ở đầu mọi bước (dùng chung với đồng hồ của nhiệm vụ), chọn thời gian nghỉ ngay ở bước nghỉ. "Nhật ký set" đổi thành "Ghi set thủ công" (thu gọn, có giải thích).

**Nguyên tắc giao diện (owner 2026-10-17):** chi tiết bài tập **không** mở popup và **không** chuyển sang màn riêng; bung ra ngay tại chỗ (chạm để mở, "Thu gọn" để đóng, mỗi lần một bài trong danh sách; buổi tập và màn đang tập cũng mở tại chỗ trong Hôm nay). Hình minh hoạ (4b) cũng nằm trong khối bung ra đó và trên thẻ bài đang tập.

**Phase 1 — dùng được (P0)**, mỗi mục có test:
1. ✅ (2026-10-17, mock + test) Hôm nay chưa có giáo án: nút "Tạo lịch tập mẫu" là hành động chính; việc không phải gym thu gọn. *Kiểm:* test TodayPage + ảnh 390px.
2. ✅ (2026-10-17, mock + test) Hôm nay có buổi dở: "Tiếp tục buổi tập · x/y set". *Kiểm:* ghi 1 set, tải lại, thấy nút tiếp tục.
3. ✅ (2026-10-17, mock + 319 test; bản dịch 35 tên cần owner rà) Tên bài tập tiếng Việt trước, Anh phụ (`nameVi`/`nameEn`), khoá lưu set không đổi. *Kiểm:* test tìm có/không dấu bằng tên Việt và Anh.
4. ◐ (2026-10-17) Đủ chuẩn bị/cách tập/hít thở/lỗi cho 13 bài của giáo án tuần 1 (`domain/exerciseGuide.ts`, cần huấn luyện viên rà); 22 bài còn lại hiện "đang biên soạn"; chưa có ảnh động tác (xem 4b; nguồn có giấy phép hoặc minh hoạ tự vẽ). Chi tiết bài: chuẩn bị, 3–5 bước, hít thở, 2–3 lỗi thường gặp, ảnh hoặc "chưa có ảnh". *Kiểm:* test dữ liệu đủ trường cho mọi bài.
4b. ◐ (2026-10-18: đã có ảnh 12 bài ở đầu chi tiết bài, hình nhỏ ở thư viện và xem trước giáo án, ảnh dưới tên ở màn đang tập, ô thay thế ghi tên dụng cụ khi thiếu/lỗi ảnh; còn 22 bài chưa có ảnh, chưa chụp từ app thật) **Hình minh hoạ bài tập và máy.** *Vấn đề (owner phản hồi 2026-10-17):* cửa sổ bài tập (màn đang tập, chi tiết bài, thư viện, xem trước giáo án) chỉ có chữ và hình cơ, người mới không biết bài đó dùng máy/dụng cụ nào và trông ra sao. Brief §4B yêu cầu ảnh đúng thiết bị và đúng biến thể.
   - **Phạm vi:** 13 bài của giáo án tuần 1 trước, rồi 22 bài còn lại. Mỗi bài: (a) hình thiết bị/máy (nhận ra được ở phòng tập), (b) hai tư thế đầu–cuối của động tác, (c) chú thích nhãn và `alt` mô tả. Hiện ở: thẻ bài trên màn đang tập (ngay dưới tên), đầu chi tiết bài, hình nhỏ trong danh sách thư viện và xem trước giáo án.
   - **Nguồn ảnh:** không dùng ảnh stock chung chung hoặc ảnh sai thiết bị. Ưu tiên minh hoạ SVG tự vẽ (đơn giản, nền tối + xanh lục, đủ nhận ra máy); ảnh chụp thật hoặc ảnh có giấy phép chỉ dùng khi owner cung cấp hoặc xác nhận nguồn + ghi ghi công. Bài chưa có hình: ô thay thế ghi "Chưa có hình" kèm biểu tượng dụng cụ (không dùng hình sai).
   - **Làm nhanh trước (không cần hình):** dòng "Dụng cụ" (ví dụ "Máy đẩy ngực") ngay trên thẻ bài ở màn đang tập, vì hiện chỉ hiện nhóm cơ.
   - **Kiểm:** test dữ liệu mọi bài của giáo án tuần 1 có hình + `alt`; test ô thay thế khi thiếu hình hoặc hình lỗi; ảnh chụp 390px của màn đang tập, chi tiết, thư viện; không cuộn ngang; tải ảnh không làm chậm mở màn tập (ảnh nhỏ, lazy).
   - **Cần owner:** chọn phong cách (vẽ SVG đơn giản hay dùng ảnh thật bạn có), và rà độ chính xác của hình với huấn luyện viên.
5. ✅ (2026-10-17, mock + 330 test) Nav 4 mục Hôm nay · Bài tập · Tiến độ · Nhân vật (ẩn, không xoá Hành trình/Số đo).

6. ✅ (2026-10-17, mock + 335 test) Màn tập: "Đã xong x/y bài", gợi ý động tác một dòng, "Lần trước", nhãn "Set N"/✓ cho từng set, nút "Tạm dừng" (set lưu ngay). **Chưa làm:** thời gian đã tập (cần mốc bắt đầu đáng tin), ảnh bài.
6b. ✅ (2026-10-17, mock + 339 test) Không còn popup/sheet cho chi tiết: chi tiết bài mở tại chỗ (tab Bài tập, thư viện, màn tập, checklist) và chi tiết buổi tập + màn đang tập mở ngay trong trang Hôm nay, dưới đúng thẻ vừa bấm (`InlinePanel`: tự cuộn tới, focus vào tiêu đề, Esc hoặc "Thu gọn" để đóng). Chỉ còn dialog thật cho: hộp mở rương, cài đặt, form tạo/sửa, nạp giáo án.
7. Tổng kết buổi tập (số bài/set, thời lượng nếu đo được, XP, bước tiếp theo) — chưa làm; làm sau 4b.

**Hướng mới (owner 2026-10-17, ADR-040):** ✅ lát cắt 1 (diện mạo theo hạng E→S, tên hạng, font), ✅ lát cắt 2 (giáo án theo mục tiêu: màn thiết lập 3 bước, `planBuilder`, nghỉ theo mục tiêu; số rep/nghỉ cần huấn luyện viên rà). ✅ lát cắt 3 (Thăng hạng hiện ảnh hạng cũ → mới và danh sách mở khoá, nhãn "Tầng n/N" trong màn tập, thẻ "Tổng kết buổi" gồm bài/set/khối lượng/thời gian/XP). Còn: 5 chỉ số gym thay 5 lĩnh vực đời sống, boss tuần theo buổi tập, Bóng theo kỷ lục (cần RFC backend cho chỉ số).

**Một giáo án từ backend (owner 2026-10-18, ADR-041):** nhánh `feat/single-plan-be`. Chỉ còn một giáo án chuẩn (toàn thân 3 buổi), định nghĩa ở `backend/.../plan/StandardPlan.java`; `GET/POST /api/v1/plan`; wizard còn 2 bước; bỏ các giáo án có sẵn khác và `planBuilder`. **Chưa merge vào main:** code backend và `TrainingPlanIntegrationTest` chưa được build trong môi trường tác giả (không tải được Maven Central). Cần chạy `cd backend && ./mvnw test` (hoặc để CI chạy) rồi mới merge. Còn lại: đưa ảnh hướng dẫn bài tập khi có; huấn luyện viên rà số rep/nghỉ.

**Phase 2 — RPG (P1):** hoàn thành buổi thưởng XP đúng một lần (đã có), tổng kết buổi, huy hiệu, avatar. **Phase 3 — hoàn thiện (P2):** QA di động, offline/lỗi, truy cập.

Chưa kiểm: bản deploy thật (cần tài khoản), iPhone thật/PWA, VoiceOver.

Ghi chú: `docs/rpg/` (gói handoff v0.1 + `STATUS.md` + tickets RPG-xx) đã bị gỡ khỏi cây làm việc ngày 2026-10-17; các ticket B-25 → B-33 còn trỏ tới nó chỉ là lịch sử. Xem bản cũ: `git show fc3f036:docs/rpg/STATUS.md`. Ảnh tham chiếu giao diện: `docs/reference/`.
