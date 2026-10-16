# B-16 — Trang bị: màn Trang bị, kho đồ và phần thưởng đeo/tháo

Trạng thái: **chưa làm, cần bàn với owner** · Chặn bởi: owner chốt phong cách ảnh (bước 1) · Ưu tiên: thấp hơn các việc cốt lõi (ghi số đo, B-11).

Bối cảnh: owner thấy trang bị vẽ bằng code (lưới dây, sau đó đa giác đặc) "xấu, không ra dáng". Ngày 2026-10-16 trang bị đã được **gỡ khỏi thẻ "Chỉ số nhân vật"** (mô hình dây phát sáng giữ nguyên, hover chỉ số vẫn sáng bộ phận). `frontend/src/domain/characterGear.ts` còn trong repo làm tham chiếu, không được render.

Mục tiêu dài hạn: trang bị là **phần thưởng** của nhiệm vụ, boss và thành tựu, có thể **đeo/tháo** trên nhân vật. Thuần thẩm mỹ, không cộng XP (giữ quy tắc "không có XP ẩn").

## Bước 1 — Hướng thể hiện (cần owner chốt trước)
- Mỗi món là một ảnh minh họa (không dựng bằng code). Chọn một phong cách chung: vẽ tay 2D tông tím-teal như ảnh boss, hay pixel art, hay khác.
- Bản thử nhỏ trước khi làm hàng loạt: một nhân vật gốc + 5 món (đầu, vai, ngực, tay, chân), kiểm tra ảnh xếp lớp có khớp thân nhân vật không (nền trong suốt, cùng khung ảnh).
- Dự phòng nếu ảnh không khớp: món chỉ hiện ở ô trang bị, nhân vật đổi viền/hào quang theo bộ đang đeo.
- Câu hỏi mở: có giữ hiệu ứng xoay 3D không (ảnh 2D thì nhân vật trong màn Trang bị đứng yên; mô hình dây ở màn chỉ số vẫn xoay).

## Bước 2 — Màn "Trang bị" (cần owner duyệt UI)
Nhân vật ở giữa, các ô quanh nhân vật (đầu, vai, ngực, tay, chân; sau này áo choàng, vũ khí); thẻ món đồ có viền theo độ hiếm; kho đồ; nút đeo/tháo; xem trước. Mock API cần có để duyệt UI trước khi làm backend.

## Bước 3 — Backend phần thưởng (sau khi UI được duyệt)
- Danh mục món đồ là cấu hình (code, tên, ô, độ hiếm, `artKey`), giống danh mục boss.
- Nguồn thưởng: hạ boss (huy hiệu chặng có thể kèm món), thành tựu, mốc level lĩnh vực, nhiệm vụ đặc biệt.
- Cấp món là sự kiện append-only như ledger; **hoàn tác boss/thành tựu phải thu hồi món đã nhận** và gỡ nó khỏi bộ đang đeo (cùng transaction, giống ACHIEVEMENT_REVOKE, trong cửa sổ sửa 7 ngày).
- Bộ đang đeo (loadout) theo (user, ô); API `GET /equipment`, `PUT/DELETE /equipment/{slot}`; chỉ đeo món mình có; mutation idempotent.
- Migration cho người dùng hiện có: món "khởi đầu" cấp theo level lĩnh vực thay cho 4 bậc trang bị cũ.

Test bắt buộc (khi làm): cấp đúng một lần, thu hồi khi undo boss/thành tựu, không đeo được món chưa có, đeo ô khác loại bị từ chối, mutation chéo user, đồng thời không cấp đôi.
