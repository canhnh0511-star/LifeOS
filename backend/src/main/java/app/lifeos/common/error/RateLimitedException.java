package app.lifeos.common.error;

import org.springframework.http.HttpStatus;

/** 429 RATE_LIMITED; the handler turns {@code retryAfterSeconds} into the `Retry-After` header. */
public class RateLimitedException extends ApiException {
    private final long retryAfterSeconds;

    public RateLimitedException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "Quá nhiều lần thử. Vui lòng thử lại sau " + minutes(retryAfterSeconds) + " phút.");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long retryAfterSeconds() { return retryAfterSeconds; }

    private static long minutes(long seconds) { return Math.max(1, (seconds + 59) / 60); }
}
