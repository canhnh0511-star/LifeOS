package app.lifeos.identity;

import app.lifeos.web.ApiException;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
class AuthService {
    static final String DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

    private final UserRepository users;
    private final PasswordEncoder encoder;
    /** Compared against when the email is unknown so login timing does not reveal which emails exist. */
    private final String dummyHash;

    AuthService(UserRepository users, PasswordEncoder encoder) {
        this.users = users; this.encoder = encoder;
        this.dummyHash = encoder.encode(UUID.randomUUID().toString());
    }

    static String normalizeEmail(String email) { return email.trim().toLowerCase(Locale.ROOT); }

    User register(AuthRequests.Register req) {
        String email = normalizeEmail(req.email());
        String timezone = req.timezone() == null || req.timezone().isBlank() ? DEFAULT_TIMEZONE : req.timezone().trim();
        try {
            ZoneId.of(timezone);
        } catch (DateTimeException e) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_FAILED", "Dữ liệu không hợp lệ.", Map.of("timezone", "Múi giờ không hợp lệ."));
        }
        if (users.existsByEmail(email)) throw emailTaken();
        try {
            return users.saveAndFlush(new User(UUID.randomUUID(), email, req.displayName().trim(), timezone, encoder.encode(req.password())));
        } catch (DataIntegrityViolationException race) {
            throw emailTaken(); // lost a concurrent insert to the unique index
        }
    }

    User authenticate(AuthRequests.Login req) {
        User user = users.findByEmail(normalizeEmail(req.email())).orElse(null);
        boolean ok = encoder.matches(req.password(), user == null ? dummyHash : user.getPasswordHash());
        if (user == null || !ok) throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
        return user;
    }

    private static ApiException emailTaken() {
        return new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "Email này đã được đăng ký.", Map.of("email", "Email này đã được đăng ký."));
    }
}
