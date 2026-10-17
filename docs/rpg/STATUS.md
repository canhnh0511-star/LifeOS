# Trạng thái lớp RPG và bàn giao (cập nhật 2026-10-17)

**Đọc file này trước.** Gói handoff RPG (các file cùng thư mục) viết cho "app v0.1"; repo thực tế đã đi xa hơn. Khi mâu thuẫn, theo `docs/DOMAIN_RULES.md`, `docs/openapi.yaml`, `docs/agent/DECISIONS.md` (ADR-036) và các ticket `docs/tickets/B-25..B-33`.

## Ánh xạ ticket
| Gói RPG | Ticket chính | Trạng thái |
|---|---|---|
| RPG-00 audit | (báo cáo, ADR-036) | Xong |
| RPG-01 nền tảng | B-25 | Xong |
| RPG-02 Main Quest | B-26 | Xong |
| RPG-03 chi tiết + đồng hồ | B-27 | Xong |
| RPG-04 tiến hoá nhân vật | B-28 | Xong |
| RPG-05 kho đồ | B-29 (cải tiến B-22) | Chưa làm |
| RPG-06 chương/hành trình | B-30 (cải tiến B-21) | Chưa làm |
| RPG-07 QA | B-31 | Chưa làm |
| RPG-08 RFC backend | B-33 | Hoãn |
| Ghi chú gym | B-32 (giáo án/thư viện) + B-34 (nhật ký set, cần backend) | B-32 xong; B-34 xong |

## Quyết định đã chốt (ADR-036)
Giai đoạn đầu là app tập gym · giữ 5 tab · giữ hạng E–S · RPG-05/06 cải tiến B-22/B-21 · build được phép chạy · không đổi backend/contract.

## Lệch giữa gói RPG và repo (đừng làm theo gói)
Gói nói 4 tab, mock localStorage cho kho đồ, stage Initiate…Sovereign, chỉ số FOCUS/STRENGTH demo, bảng token `--rpg-*`. Thực tế: 5 tab; kho đồ lưu server (ADR-034); rank E–S (`domain/ranks.ts`); radar theo dữ liệu thật; biến CSS rút từ palette hiện có. Ví dụ học/piano/đọc sách chỉ là minh hoạ cũ.

## Đã chạy và chưa kiểm (2026-10-17)
- `cd frontend && npm test`: 259 test đạt; backend `./mvnw test` 200 test đạt (có V12); `npx tsc --noEmit` sạch; `npm run build` thành công.
- **Chưa làm được:** ảnh chụp 390/768/1440px, kiểm vùng chạm 44px/safe-area/nút Back/tương phản trên trình duyệt thật, bản Railway, PWA trên iPhone, test backend. Gom vào B-31.

## Ảnh tham chiếu giao diện của owner (2026-10-17)
10 màn kiểu RPG (Hôm nay, lịch tuần, chi tiết buổi, chi tiết bài, đang tập, thư viện, nhóm cơ, nhân vật, kho đồ, thống kê). Owner duyệt layout và hiệu ứng, **giữ màu xanh hiện tại**; không dùng nhân vật/tên giống tác phẩm gốc. Chia thành B-35 (xong) và B-36 → B-41; màn chưa làm chờ duyệt từng ticket.

## Quy trình
Một ticket mỗi lần, báo cáo file đổi + lệnh test + known gaps, chờ owner duyệt rồi mới sang ticket sau. Bất biến: XP chỉ từ mutation hoàn thành; timer/ghim/độ khó không đổi XP; streak theo buổi có lịch; ngày theo timezone user.

## Tuỳ chọn UI cục bộ (localStorage, không đồng bộ)
`lifeos:ui:reduce-motion` · `lifeos.main-quest.<date>` · `lifeos.timer.<habitId>:<date>` · `lifeos.chests.opened`.

## Việc kế tiếp đề xuất
B-29 → B-30 → B-31. Các thay đổi B-25..B-28, B-32 và tài liệu này chưa được commit; `docs/seed/` và việc xoá `start-preview.sh` là thay đổi có sẵn từ trước.
