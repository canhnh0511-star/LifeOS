# B-07 — Rate limit đăng nhập và chống lạm dụng auth

Trạng thái: **xong** (ADR-027) · Ưu tiên: cao (domain Railway đã public) · Chặn bởi: không.

Mục tiêu: chặn dò mật khẩu và đăng ký hàng loạt mà không làm lộ email nào đã tồn tại.

Phạm vi: giới hạn số lần `POST /auth/login` và `/auth/register` theo IP và theo email fingerprint; trả `429 RATE_LIMITED` kèm `Retry-After`; khoá tạm theo cửa sổ trượt, tự mở; giới hạn không phân biệt email tồn tại hay không; nhận IP thật qua `X-Forwarded-For` đã cấu hình (`server.forward-headers-strategy: framework`); log audit `auth.rate_limited` (chỉ fingerprint, không email/mật khẩu); cập nhật `docs/openapi.yaml`, `docs/API_CONTRACT.md` (mã lỗi mới) và `frontend/src/api/types.ts`, `errors.ts`; AuthGate hiển thị thông báo thân thiện.

Test bắt buộc: vượt ngưỡng thì 429 với cả email đúng lẫn sai; email không tồn tại bị giới hạn y hệt; hết cửa sổ thì đăng nhập lại được; IP khác không bị ảnh hưởng; không lộ tồn tại email qua thời gian/mã lỗi.
Loại trừ: CAPTCHA, đặt lại mật khẩu (B-12).
Câu hỏi mở cho owner: bộ đếm trong bộ nhớ (một instance, mất khi redeploy) hay lưu Postgres (bền, chạy nhiều instance).
