# Ghi chú: Giai đoạn đầu dùng Life OS như app hỗ trợ tập gym

**Trạng thái:** đã chốt bằng ADR-036 (2026-10-17) và theo dõi ở ticket B-32; các câu hỏi mở bên dưới vẫn cần owner trả lời. Ghi lại ngày 2026-10-17 để chỉnh bộ tài liệu RPG khi bắt đầu làm.

## Quyết định
Giai đoạn đầu, Life OS là **app hỗ trợ tập gym**: mỗi ngày có bài tập theo từng nhóm cơ. Chưa làm theo hướng "thay đổi toàn bộ các khía cạnh cuộc sống" như brief RPG đang viết (học, piano, đọc sách, sức khỏe...).

Lớp RPG (Status Window, Mission Board, Hunter, Inventory, Journey) vẫn giữ. Nội dung nó hiển thị đổi từ "quest đời sống" sang "buổi tập gym".

## Chỗ trong bộ tài liệu cần chỉnh khi bắt đầu

| File | Đang viết | Cần chỉnh thành |
|---|---|---|
| `LIFE_OS_RPG_AGENT_BRIEF.md` §0, §5 | Học, piano, đọc sách, workout là ví dụ chính | Ví dụ demo là bài tập gym (xem bên dưới) |
| `LIFE_OS_RPG_AGENT_BRIEF.md` §5 | `Deep Work Spring Boot`, `Luyện piano`, `Đọc sách`... | Thay bằng quest tập, ví dụ `Ngực + Tay sau — 60 phút` |
| `01_PRODUCT_SCOPE.md` persona | Người học nghề + piano + sức khỏe + đọc sách | Người tập gym theo lịch chia nhóm cơ |
| `02_UX_DESIGN.md` Hunter | Chỉ số FOCUS / KNOWLEDGE / STRENGTH / CREATIVITY / DISCIPLINE | Ưu tiên chỉ số cơ thể (STRENGTH, ENDURANCE, DISCIPLINE...) hoặc theo nhóm cơ; vẫn phải gắn nhãn Demo cho đến khi có cách tính |
| `02_UX_DESIGN.md` Journey | Hành trình 66 ngày, 6 chương × 11 ngày | Giữ nguyên, không đổi thời lượng; đổi tên chương theo giai đoạn tập nếu muốn |
| `03_RULES_AND_DATA.md` catalogue | `BADGE_SEVEN_SESSIONS`... | Thêm huy hiệu theo buổi tập, ví dụ `BADGE_FIRST_WORKOUT`, `BADGE_10_SESSIONS`. Vẫn chỉ mở khi có bằng chứng từ dữ liệu thật |
| `tickets/RPG-02..06` | Quest chung chung | Quest = buổi tập của ngày, nhóm theo nhóm cơ |

## Cách ánh xạ vào mô hình hiện có (đề xuất)
- **Nhóm cơ → habit/goal:** mỗi nhóm cơ (Ngực, Lưng, Chân, Vai, Tay, Bụng) là một goal hoặc habit có lịch riêng. Đây là cách dùng đúng contract hiện có, không cần backend mới.
- **Buổi tập hằng ngày → scheduled quest:** mỗi ngày một quest chính là buổi tập của nhóm cơ hôm đó. Streak tiếp tục tính theo buổi có lịch, nên ngày nghỉ theo lịch không bị phạt. Phù hợp với việc ngày nghỉ là một phần của giáo án.
- **Main Quest:** buổi tập của nhóm cơ hôm nay.
- **Quest tùy chọn:** cardio, giãn cơ, đi bộ. Chỉ dùng khi mô hình optional được hỗ trợ rõ (xem câu hỏi mở).
- **Số đo cơ thể:** B-24 (cân nặng, vòng eo, body fat) đã có và không sinh XP. Giữ nguyên. Có thể hiển thị trong Hunter như số liệu thật, không phải mock.
- **Timer:** dùng cho thời gian nghỉ giữa set hoặc thời lượng buổi tập, vẫn không sinh XP.

## Câu hỏi mở (cần chốt trước khi làm ticket tương ứng)
1. **Mức chi tiết của bài tập:** quest chỉ là "hoàn thành buổi tập ngực" hay phải ghi từng bài, số set, số rep, mức tạ? Ghi từng bài cần contract mới (backend chưa mở khóa cho phần RPG), nên giai đoạn đầu nên dừng ở mức buổi tập.
2. **Giáo án:** tự nhập, hay app có sẵn thư viện bài tập theo nhóm cơ? Thư viện có sẵn là dữ liệu tĩnh ở frontend, không cần backend.
3. **Nhóm cơ hôm nay** do lịch cố định theo thứ trong tuần quyết định, hay người dùng chọn mỗi ngày? Lịch cố định khớp với quy tắc "không đổi schedule hồi tố".
4. **XP theo độ khó:** giữ công thức XP hiện có. Độ khó chỉ hiển thị theo ngưỡng XP, đúng như tài liệu.
5. **Hướng "quest theo chỉ số"** đã ghi trong memory (per-stat quest generation): quyết định có gộp vào đây không, hay để sau giai đoạn gym.

## Đoạn thêm vào prompt khởi động
Dán thêm vào prompt RPG-00 trong `README_RPG_HANDOFF.md`:

> Phạm vi giai đoạn đầu: Life OS dùng như app hỗ trợ tập gym với bài tập theo từng nhóm cơ mỗi ngày, không phải thay đổi toàn bộ cuộc sống. Mọi ví dụ học/piano/đọc sách trong brief chỉ là minh họa cũ; hãy thay bằng nội dung gym khi lập kế hoạch. Giữ nguyên các bất biến domain (XP, streak theo buổi có lịch, timezone).

## Giữ nguyên, không đổi
Bất biến domain (XP chỉ từ mutation hoàn thành, streak theo buổi có lịch, không bonus XP ẩn), quy trình một ticket mỗi lần, và việc chờ duyệt UI trước khi đụng backend.
