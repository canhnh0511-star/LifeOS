package app.lifeos.common.logging;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.slf4j.MDC;

/** Per-request log context. `requestId` and `userId` appear on every log line via the MDC (see logging.pattern in application.yml). */
public final class LogContext {
    public static final String REQUEST_ID = "requestId";
    public static final String USER_ID = "userId";
    static final String USER_ATTRIBUTE = "app.lifeos.userId";

    private LogContext() {}

    /** Marks the request as belonging to a user, for log lines and the access log. */
    public static void user(HttpServletRequest request, String userId) {
        MDC.put(USER_ID, userId);
        request.setAttribute(USER_ATTRIBUTE, userId);
    }

    /** Stable, non-reversible-in-practice handle for correlating events about one email without writing the address to logs. */
    public static String fingerprint(String value) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d, 0, 6);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
