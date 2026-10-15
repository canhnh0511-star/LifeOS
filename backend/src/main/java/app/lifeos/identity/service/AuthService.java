package app.lifeos.identity.service;

import app.lifeos.common.error.ApiException;
import app.lifeos.common.logging.LogContext;
import app.lifeos.identity.dto.AuthRequests;
import app.lifeos.identity.model.User;
import app.lifeos.identity.repository.UserRepository;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    static final String DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

    private final UserRepository users;
    private final PasswordEncoder encoder;
    /** Compared against when the email is unknown so login timing does not reveal which emails exist. */
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder encoder) {
        this.users = users; this.encoder = encoder;
        this.dummyHash = encoder.encode(UUID.randomUUID().toString());
    }

    static String normalizeEmail(String email) { return email.trim().toLowerCase(Locale.ROOT); }

    public User register(AuthRequests.Register req) {
        String email = normalizeEmail(req.email());
        String timezone = req.timezone() == null || req.timezone().isBlank() ? DEFAULT_TIMEZONE : req.timezone().trim();
        try {
            ZoneId.of(timezone);
        } catch (DateTimeException e) {
            log.info("auth.register.rejected reason=invalid_timezone");
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_FAILED", "Dữ liệu không hợp lệ.", Map.of("timezone", "Múi giờ không hợp lệ."));
        }
        if (users.existsByEmail(email)) { log.warn("auth.register.rejected reason=email_taken email={}", LogContext.fingerprint(email)); throw emailTaken(); }
        try {
            User user = users.saveAndFlush(new User(UUID.randomUUID(), email, req.displayName().trim(), timezone, encoder.encode(req.password())));
            log.info("auth.register.created userId={} timezone={}", user.getId(), timezone);
            return user;
        } catch (DataIntegrityViolationException race) {
            log.warn("auth.register.rejected reason=email_taken_race email={}", LogContext.fingerprint(email));
            throw emailTaken(); // lost a concurrent insert to the unique index
        }
    }

    public User authenticate(AuthRequests.Login req) {
        User user = users.findByEmail(normalizeEmail(req.email())).orElse(null);
        boolean ok = encoder.matches(req.password(), user == null ? dummyHash : user.getPasswordHash());
        if (user == null || !ok) {
            // Same response either way (no account enumeration); the log keeps the real reason for investigation.
            log.warn("auth.login.failed reason={} email={}", user == null ? "unknown_email" : "bad_password", LogContext.fingerprint(normalizeEmail(req.email())));
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
        }
        return user;
    }

    private static ApiException emailTaken() {
        return new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "Email này đã được đăng ký.", Map.of("email", "Email này đã được đăng ký."));
    }
}
