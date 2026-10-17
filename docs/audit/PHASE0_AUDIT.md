# Phase 0 — Audit giao diện (2026-10-17)

## Phạm vi và giới hạn (đọc trước)

- **Bản deploy `https://mylife-os.up.railway.app/`:** bắt đăng nhập. Ban đầu chỉ chụp được màn đăng nhập (`live-m.png`, `live-d.png`). Sau khi owner cho phép (2026-10-17), tôi đăng ký **một tài khoản test** (nickname "Tester", email `lifeos.audit.<timestamp>@example.com`; mật khẩu không lưu trong repo) và chạy lại luồng trên production: ảnh `prod-*.png`. Dữ liệu ghi lên production chỉ nằm trong tài khoản test này (một giáo án gym + 1 set).
- **Thay thế:** chạy cùng mã nguồn `frontend/` ở chế độ mock (`VITE_API_MODE` mặc định, localStorage, "CHẾ ĐỘ THỬ") bằng Vite dev + Chrome headless (puppeteer-core). Đây là **cùng UI nhưng không phải bản deploy**: không kiểm được backend thật, đăng nhập, dữ liệu thật của owner.
- Chưa kiểm: iPhone thật, PWA, offline, VoiceOver.
- Ảnh chụp trong thư mục này là từ bản đang chạy thật. Ảnh `*-390.png` là full-page nên thanh nav dưới (fixed) hiện giữa ảnh; đó là hiện tượng của cách chụp, không phải lỗi.

## Luồng đã chạy (390×844, mock)

Mở app → Hôm nay → "Nạp giáo án gym" → chọn giáo án mặc định → Hôm nay → "Bắt đầu buổi tập" → ghi set 1 → tải lại trang → mở lại buổi tập → Thư viện. Không có lỗi console/pageerror ở cả 5 tab × 390/1440; không cuộn ngang.

## Bảng bằng chứng

Cột "Loại": **O** = quan sát trực tiếp trên bản chạy, **C** = đọc từ mã, **A** = suy đoán chưa kiểm.

| # | Vấn đề | Bằng chứng | Loại | Ảnh hưởng | Hướng sửa | Ưu tiên |
|---|---|---|---|---|---|---|
| 1 | Chưa có giáo án thì "Việc chính hôm nay" là Practice piano / Move your body / Meditate; gym chỉ là một thẻ "Chưa có giáo án gym" bên dưới | `local-today-390.png`; seed mock | O | Sai định hướng v1 (gym), người mới không biết làm gì | Today không có giáo án: một CTA "Tạo lịch tập mẫu" ở trên cùng; việc không phải gym thu gọn. Seed demo chuyển sang gym | P0 |
| 2 | Tên bài tập chỉ tiếng Anh ("Machine Chest Press", "Goblet Squat", "Barbell Bench Press") trong thư viện, giáo án và màn tập | `flow-1-import.png`, `flow-5-after-set.png`; `domain/exerciseLibrary.ts` (`ex(id, name…)`) | O+C | Người mới không rành tên động tác; trái yêu cầu "tên Việt trước" | Thêm `nameVi` + `nameEn` (alias), hiển thị Việt trước. Tên dùng ở set log (ADR-037) phải giữ ổn định: đổi hiển thị, không đổi khoá lưu | P0 |
| 3 | Chi tiết bài chỉ có hình cơ (`MuscleFigure`) và 1–3 gợi ý ngắn; không có ảnh/động tác, không có Chuẩn bị / Các bước / Hít thở / Lỗi thường gặp | `components/ExerciseDetail.tsx`, `domain/exerciseInfo.ts` (`cues: string[]`) | C | Không dạy được động tác — mục tiêu cốt lõi của v1 | Mở rộng `ExerciseInfo` (chuẩn bị, 3–5 bước, hít thở, 2–3 lỗi). Ảnh: chưa có nguồn có giấy phép, dùng minh hoạ SVG tự vẽ hoặc chữ và đánh dấu "chưa có ảnh" | P0 |
| 4 | ~~Thư viện không có tìm kiếm~~ **Đính chính:** ô tìm có sẵn (`ExerciseLibrary.tsx:50`, bỏ dấu, khớp tên/nhóm cơ/dụng cụ); bản audit đầu chỉ liệt kê nút nên bỏ sót. Còn thiếu: lọc theo dụng cụ/trình độ và alias tiếng Anh/Việt (tên hiện chỉ có tiếng Anh) | `ExerciseLibrary.tsx:11-50` | C | Tìm bằng tên Việt chưa được vì chưa có tên Việt | Thêm `nameVi` (xem #2) rồi tìm trên cả hai; lọc dụng cụ/trình độ | P1 |
| 5 | Thư viện chỉ là lối tắt trong Today; nav dưới là Hôm nay / Hành trình / Nhân vật / Số đo / Thống kê | `ui/nav.ts` | O+C | Menu khó tìm (owner đã phản ánh); "Hành trình 66 ngày" và "Số đo" là tính năng ngoài gym | Nav 4 mục: Hôm nay · Bài tập · Tiến độ · Nhân vật; ẩn (không xoá dữ liệu) Hành trình/Số đo | P1 |
| 6 | Tải lại giữa buổi: màn tập đóng, Today vẫn hiện "Bắt đầu buổi tập" (không "Tiếp tục"). Dữ liệu set **vẫn còn** (mở lại thấy "Set 1: 10 rep", đang Set 2/2) | `flow-6-after-reload`, `flow-7-reopen` | O | Dữ liệu không mất (đạt), nhưng không rõ là buổi đang dở | Today hiện "Tiếp tục buổi tập · 1/10 set" khi có set đã ghi mà chưa kết thúc | P0 |
| 7 | Màn tập: hai ô số "10" và "2" ngay dưới tên bài không có nhãn (ô chọn set?) | `flow-5-after-set.png` | O | Không hiểu nghĩa; ý nghĩa thật chưa xác minh trong mã | Xác minh trong `SetLog.tsx`, gắn nhãn "Set 1/2/…" | P1 |
| 8 | Màn tập thiếu: tiến độ bài `x/y`, tạm dừng, thời gian đã tập, ảnh bài, "lần trước" | `flow-5` | O | Chưa là "battle mode" như brief | Thanh trên gọn + thẻ bài hiện tại có ảnh/gợi ý 1 dòng + lần trước | P1 |
| 9 | Đồng hồ nghỉ tự chạy 01:30 sau khi ghi set, có "Bỏ qua nghỉ" | `flow-5` | O | Đạt | — | — |
| 10 | Chữ lẫn Anh–Việt trong dữ liệu seed ("Read & reflect", "Move your body") và tiêu đề Journey ("The 66-Day Reset") | `local-*-390.png` | O | Không nhất quán tiếng Việt | Việt hoá seed khi chuyển seed sang gym | P2 |
| 11 | Nút "Nạp giáo án" nằm dưới cuối modal dài (phải cuộn); nút chọn radio hiển thị lệch giữa phía trên chữ | `flow-1-import.png` | O | Khó thấy hành động chính | Footer cố định cho nút xác nhận | P2 |
| 12 | Tồn tại ticket và ADR kiểu "life OS tổng quát" (B-02 → B-24, per-stat quest, 66 ngày) trong tài liệu hướng dẫn agent | CLAUDE.md, `docs/tickets/README.md`, bộ nhớ agent | C | Agent có thể ưu tiên sai | Xem `docs/DOC_CLEANUP_REPORT.md` | P0 |

## Bản production (tài khoản test, 390×844) — quan sát

- Đăng ký → Hôm nay trống ("chưa có nhiệm vụ nào", nút Nạp giáo án gym và Tạo thói quen) → nạp giáo án → Bắt đầu buổi tập → ghi set 1 → tải lại → **đăng nhập lại** → mở buổi tập: vẫn thấy "Set 1: 10 rep", đang Set 2/2. Lưu phía server đạt (`prod-6-relogin-resume.png`).
- 5 tab không cuộn ngang. Tab "Hành trình" của người dùng mới vẫn là "The 66-Day Reset" (tiếng Anh, ngoài phạm vi gym) — xem #5/#10.
- **Lỗi mới #13 (P1):** 4 ảnh vật phẩm gym trả **404** trên production: `/items/gym-floor-mantle.jpg`, `hourglass-of-reps.jpg`, `iron-grip-gauntlets.jpg`, `sweatband-of-dawn.jpg`. Danh mục (`domain/items.ts`) có, nhưng `frontend/public/items/` chỉ có 6 ảnh cũ. Ảnh hưởng: `ItemArt.tsx` có hình dự phòng (biểu tượng hộp) nên bố cục không vỡ, nhưng 4 vật phẩm gym sẽ hiện biểu tượng chung thay vì ảnh, kèm 404 trong console (chưa xem trực tiếp vì tài khoản test chưa có vật phẩm). Cách sửa: thêm 4 ảnh nguyên bản, hoặc chấp nhận hình dự phòng.
- `GET /api/v1/me` → 401 khi chưa đăng nhập là bình thường.

## Đạt (quan sát)

Không cuộn ngang 390/1440 ở 5 tab; không lỗi console; nạp giáo án → set được lưu và còn sau khi tải lại; đồng hồ nghỉ có nút bỏ qua; ô nhập rep/kg có nhãn.

## Chưa kiểm

1. Hoàn thành buổi và nhận XP đúng một lần trên production (sẽ ghi XP vào tài khoản test; làm khi có test tự động/đồng ý).
2. iPhone thật, PWA, offline, VoiceOver.
