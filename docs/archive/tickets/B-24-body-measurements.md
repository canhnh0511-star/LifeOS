> **SUPERSEDED** — lưu trữ, không còn là yêu cầu. Xem `docs/archive/SUPERSEDED.md` và `docs/PRODUCT_V1.md`.

# B-24 — Số đo cơ thể

Trạng thái: **xong** (2026-10-16) · Owner duyệt hướng: theo đề xuất (cân nặng, vòng eo, mỡ cơ thể % + chỉ số tự thêm; không XP).

- Backend (V11, ADR-035): `GET/POST /metrics`, `DELETE /metrics/{id}`, `PUT/DELETE /metrics/{id}/entries/{date}`; mặc định tạo lười; ghi cùng ngày thì thay; kiểm tra giá trị/ngày; cô lập theo user; không đụng ledger.
- Frontend: tab "Số đo" (thanh điều hướng có 5 mục), mỗi chỉ số một thẻ: số mới nhất, so với lần trước và so với đầu cửa sổ, đường xu hướng, form ngày + giá trị (nhận `72,5` hoặc `72.5`), lịch sử 7 lần gần nhất có xoá, thêm/xoá chỉ số riêng.
- Mock đối xứng với HTTP; test backend (cô lập, đồng thời, validate) và frontend (component, mock).
- Chưa làm: mục tiêu số đo (ví dụ "đạt 68 kg"), biểu đồ dài hạn có trục ngày, nhập hàng loạt, nhắc đo định kỳ.
