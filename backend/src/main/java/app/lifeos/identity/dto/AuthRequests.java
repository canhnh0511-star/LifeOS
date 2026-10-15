package app.lifeos.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthRequests {
    private AuthRequests() {}

    // BCrypt only hashes the first 72 bytes, so cap the length instead of silently truncating.
    public record Register(
        @NotBlank(message = "Nhập email.") @Email(message = "Email không hợp lệ.") @Size(max = 254, message = "Email quá dài.") String email,
        @NotBlank(message = "Nhập mật khẩu.") @Size(min = 10, max = 72, message = "Mật khẩu từ 10 đến 72 ký tự.") String password,
        @NotBlank(message = "Nhập tên hiển thị.") @Size(max = 60, message = "Tên tối đa 60 ký tự.") String displayName,
        @Size(max = 64, message = "Múi giờ không hợp lệ.") String timezone) {}

    public record Login(
        @NotBlank(message = "Nhập email.") @Size(max = 254) String email,
        @NotBlank(message = "Nhập mật khẩu.") @Size(max = 72) String password) {}
}
