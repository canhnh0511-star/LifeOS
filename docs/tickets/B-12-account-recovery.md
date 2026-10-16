# B-12 — Khôi phục tài khoản và xác minh email

Trạng thái: **chưa làm** · Cần owner quyết định nhà cung cấp gửi email.

Hiện tại: đăng ký email + mật khẩu (ADR-021), không có đặt lại mật khẩu, không xác minh email, không đổi mật khẩu/email, không xoá tài khoản.

Phạm vi đề xuất: quên/đặt lại mật khẩu bằng token một lần có hạn (lưu hash, không lưu token thô); xác minh email; đổi mật khẩu khi đang đăng nhập (huỷ các session khác); xoá tài khoản và dữ liệu theo yêu cầu; đăng nhập OAuth (GitHub/Google) như một cách đăng nhập khác dùng chung session (ADR-008). Mọi luồng không lộ email có tồn tại hay không; chịu rate limit của B-07.

Test bắt buộc: token dùng một lần, hết hạn, sai token; reset huỷ session cũ; phản hồi giống nhau cho email lạ.
Câu hỏi mở: dịch vụ email (Resend/SES/SMTP), có bắt buộc xác minh trước khi dùng hay không.
