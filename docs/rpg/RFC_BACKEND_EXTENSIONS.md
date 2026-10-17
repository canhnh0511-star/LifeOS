# RFC — Mở rộng backend còn lại cho lớp RPG/gym (B-33, RPG-08)

Trạng thái: **owner đã quyết 2026-10-17: không triển khai** (xem mục 8) · Chỉ là tài liệu.

## 1. Đã có trên backend thật (không cần RFC nữa)
| Nhu cầu | Cách đã giải quyết |
|---|---|
| Vật phẩm, đeo/tháo, lưu theo tài khoản | ADR-034, `user_items`, 10 món (4 món gym thêm ở B-29) |
| Số đo cơ thể | ADR-035 |
| Ghi từng set/rep/kg | ADR-037, `workout_sets` |
| Huy hiệu theo buổi tập | ADR-038, `GET /badges` (tính khi đọc, không XP) |
| Thống kê tập luyện | ADR-038, `GET /workout-stats` |

## 2. Còn chạy cục bộ (localStorage), mất khi đổi thiết bị
| Dữ liệu | Khoá hiện tại | Hệ quả |
|---|---|---|
| Ghim Main Quest theo ngày | `lifeos.main-quest.<date>` | Máy khác thấy Main Quest mặc định |
| Giảm chuyển động | `lifeos:ui:reduce-motion` | Phải bật lại trên mỗi máy |
| Thời gian nghỉ theo bài | `lifeos.rest.<exerciseId>` | Nghỉ về mặc định khi đổi máy |
| Đồng hồ buổi tập đang chạy | `lifeos.timer.<habitId>:<date>` | Không tiếp tục được ở máy khác (cố ý: đồng hồ là công cụ cục bộ) |
| Rương đã mở (hiệu ứng) | `lifeos.chests.opened` | Có thể xem lại hiệu ứng mở rương trên máy khác |

## 3. Đề xuất tối thiểu: tuỳ chọn theo tài khoản
Một bảng `user_preferences (user_id PK → users, reduce_motion BOOLEAN NOT NULL DEFAULT FALSE, rest_seconds JSONB NOT NULL DEFAULT '{}', updated_at)` (migration `V13`) và hai endpoint có phạm vi theo người đăng nhập:
- `GET /me/preferences` → `{reduceMotion, restSeconds: {<exerciseId>: 15..600}}`; chưa có dòng thì trả mặc định, không tạo dòng khi đọc.
- `PATCH /me/preferences` nhận từng phần (`reduceMotion`, `restSeconds` là map thay-từng-khoá); idempotent; khoá lạ hoặc giá trị ngoài 15–600 là 422 theo từng trường.

**Ghim Main Quest** nên tách riêng nếu làm: `main_quest_pins (user_id, pin_date, habit_id)` với khoá chính `(user_id, pin_date)`, `PUT/DELETE /pins/{date}`; chỉ cho habit của chính user và có lịch ngày đó (404 nếu không), vì pin chỉ là ưu tiên hiển thị.

## 4. Bất biến phải giữ
Không XP, không ledger, không streak và không chest từ bất kỳ dữ liệu nào ở đây; mọi truy vấn có `user_id`; id của người khác trả 404; ngày theo timezone user; client vẫn chạy khi server từ chối (dùng giá trị cục bộ rồi báo lỗi).

## 5. Tương thích và migration
- Chỉ thêm bảng và endpoint mới, không đổi DTO hiện có; client cũ chạy bình thường.
- Lần đầu đăng nhập sau khi bật, client đẩy giá trị localStorage hiện có lên một lần (PATCH), sau đó server là nguồn đúng; xung đột: server thắng.
- Mock client cần cùng hợp đồng (theo quy ước repo: cập nhật `openapi.yaml` và `types.ts` cùng lúc).

## 6. Kế hoạch test
Integration (Postgres): yêu cầu cần session; mặc định khi chưa có dòng; PATCH từng phần giữ trường khác; giá trị sai → 422 đúng trường; hai user không thấy nhau; ghim: habit của người khác → 404, habit không có lịch ngày đó → 422; không tạo giao dịch ledger. Frontend: đọc/ghi qua API, rơi về localStorage khi lỗi mạng.

## 7. Quyết định cần owner
1. Có muốn đồng bộ tuỳ chọn giữa thiết bị không (nếu chỉ dùng một máy thì không đáng làm)?
2. Ghim Main Quest có cần đồng bộ, hay giữ cục bộ?
3. Có cần tab "Tất cả" cho thống kê (cần `days` lớn hơn 90 hoặc endpoint theo khoảng ngày)?

## 8. Quyết định của owner (2026-10-17, "theo đề xuất")
1. Không đồng bộ tuỳ chọn giữa thiết bị: giữ localStorage cho giảm chuyển động và thời gian nghỉ.
2. Không đồng bộ ghim Main Quest.
3. Không thêm tab "Tất cả" cho thống kê; 7/30 ngày là đủ (tối đa 90 ngày ở API).
Nghĩa là không có `V13`, không có endpoint mới. Mở lại RFC này nếu sau này dùng nhiều thiết bị.
