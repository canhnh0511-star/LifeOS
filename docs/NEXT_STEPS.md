# Việc kế tiếp (v1 = tập gym)

Nguồn: `docs/LIFE_OS_SOLO_LEVELING_GYM_REFOCUS.md` §8–9; bằng chứng: `docs/audit/PHASE0_AUDIT.md`. Ticket cũ còn hiệu lực: `docs/tickets/` (B-25 → B-41, B-11 → B-13).

**Phase 1 — dùng được (P0)**, mỗi mục có test:
1. ✅ (2026-10-17, mock + test) Hôm nay chưa có giáo án: nút "Tạo lịch tập mẫu" là hành động chính; việc không phải gym thu gọn. *Kiểm:* test TodayPage + ảnh 390px.
2. ✅ (2026-10-17, mock + test) Hôm nay có buổi dở: "Tiếp tục buổi tập · x/y set". *Kiểm:* ghi 1 set, tải lại, thấy nút tiếp tục.
3. ✅ (2026-10-17, mock + 319 test; bản dịch 35 tên cần owner rà) Tên bài tập tiếng Việt trước, Anh phụ (`nameVi`/`nameEn`), khoá lưu set không đổi. *Kiểm:* test tìm có/không dấu bằng tên Việt và Anh.
4. ◐ (2026-10-17) Đủ chuẩn bị/cách tập/hít thở/lỗi cho 13 bài của giáo án tuần 1 (`domain/exerciseGuide.ts`, cần huấn luyện viên rà); 22 bài còn lại hiện "đang biên soạn"; chưa có ảnh động tác (nguồn có giấy phép hoặc minh hoạ tự vẽ). Chi tiết bài: chuẩn bị, 3–5 bước, hít thở, 2–3 lỗi thường gặp, ảnh hoặc "chưa có ảnh". *Kiểm:* test dữ liệu đủ trường cho mọi bài.
5. ✅ (2026-10-17, mock + 330 test) Nav 4 mục Hôm nay · Bài tập · Tiến độ · Nhân vật (ẩn, không xoá Hành trình/Số đo).

**Phase 2 — RPG (P1):** hoàn thành buổi thưởng XP đúng một lần (đã có), tổng kết buổi, huy hiệu, avatar. **Phase 3 — hoàn thiện (P2):** QA di động, offline/lỗi, truy cập.

Chưa kiểm: bản deploy thật (cần tài khoản), iPhone thật/PWA, VoiceOver.

Ghi chú: `docs/rpg/` (gói handoff v0.1 + `STATUS.md` + tickets RPG-xx) đã bị gỡ khỏi cây làm việc ngày 2026-10-17; các ticket B-25 → B-33 còn trỏ tới nó chỉ là lịch sử. Xem bản cũ: `git show fc3f036:docs/rpg/STATUS.md`. Ảnh tham chiếu giao diện: `docs/reference/`.
