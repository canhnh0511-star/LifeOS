package app.lifeos.identity.service;

import app.lifeos.common.error.RateLimitedException;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Sliding-window limiter for login and registration, per client IP and per email fingerprint (B-07, ADR-027).
 * State lives in memory: one instance, cleared on redeploy. Every admitted attempt is recorded up front, so a burst of
 * parallel guesses cannot all slip past the check; a successful login refunds its slot. The decision never looks at
 * whether the email exists, so a blocked response is identical for known and unknown addresses.
 */
@Component
public class AuthRateLimiter {
    private static final Logger log = LoggerFactory.getLogger(AuthRateLimiter.class);
    private static final long SWEEP_EVERY_MS = 60_000;
    /** Hard bound on tracked keys (oldest-inserted evicted first) so unauthenticated callers cannot grow memory without limit. */
    private static final int MAX_KEYS = 100_000;

    private final Clock clock;
    private final int loginPerIp, loginPerEmail, registerPerIp, registerPerEmail;
    private final long loginWindowMs, registerWindowMs;
    private final Map<String, Deque<Long>> events = new LinkedHashMap<>() {
        @Override protected boolean removeEldestEntry(Map.Entry<String, Deque<Long>> eldest) { return size() > MAX_KEYS; }
    };
    private long lastSweep;

    public AuthRateLimiter(Clock clock,
                           @Value("${lifeos.auth.rate-limit.login-per-ip:30}") int loginPerIp,
                           @Value("${lifeos.auth.rate-limit.login-per-email:5}") int loginPerEmail,
                           @Value("${lifeos.auth.rate-limit.login-window:15m}") Duration loginWindow,
                           @Value("${lifeos.auth.rate-limit.register-per-ip:20}") int registerPerIp,
                           @Value("${lifeos.auth.rate-limit.register-per-email:5}") int registerPerEmail,
                           @Value("${lifeos.auth.rate-limit.register-window:1h}") Duration registerWindow) {
        this.clock = clock;
        this.loginPerIp = loginPerIp; this.loginPerEmail = loginPerEmail; this.loginWindowMs = loginWindow.toMillis();
        this.registerPerIp = registerPerIp; this.registerPerEmail = registerPerEmail; this.registerWindowMs = registerWindow.toMillis();
    }

    /** Opaque receipt of an admitted login attempt; pass it to {@link #loginSucceeded}. */
    public record Attempt(String ip, String emailFp, long at) {}

    /** Admits and records a login attempt, or throws 429. Called before the password is checked. */
    public synchronized Attempt admitLogin(String ip, String emailFp) {
        long now = clock.millis();
        sweep(now);
        String ipKey = "login:ip:" + ip, emailKey = "login:email:" + emailFp;
        long wait = Math.max(retryMs(ipKey, loginPerIp, loginWindowMs, now), retryMs(emailKey, loginPerEmail, loginWindowMs, now));
        if (wait > 0) throw blocked("login", ip, emailFp, wait);
        record(ipKey, now); record(emailKey, now);
        return new Attempt(ip, emailFp, now);
    }

    /** A correct password refunds only its own slots; failures by anyone else (an attacker's guesses) stay counted. */
    public synchronized void loginSucceeded(Attempt attempt) {
        refund("login:ip:" + attempt.ip(), attempt.at());
        refund("login:email:" + attempt.emailFp(), attempt.at());
    }

    private void refund(String key, long at) {
        Deque<Long> q = events.get(key);
        if (q == null) return;
        q.removeFirstOccurrence(at);
        if (q.isEmpty()) events.remove(key);
    }

    /** Admits and records a registration attempt (every attempt counts, successful or not), or throws 429. */
    public synchronized void admitRegister(String ip, String emailFp) {
        long now = clock.millis();
        sweep(now);
        String ipKey = "register:ip:" + ip, emailKey = "register:email:" + emailFp;
        long wait = Math.max(retryMs(ipKey, registerPerIp, registerWindowMs, now), retryMs(emailKey, registerPerEmail, registerWindowMs, now));
        if (wait > 0) throw blocked("register", ip, emailFp, wait);
        record(ipKey, now); record(emailKey, now);
    }

    private RateLimitedException blocked(String action, String ip, String emailFp, long waitMs) {
        long seconds = Math.max(1, (waitMs + 999) / 1000);
        log.warn("auth.rate_limited action={} emailFp={} retryAfterSeconds={}", action, emailFp, seconds); // fingerprint only; never email or password
        return new RateLimitedException(seconds);
    }

    /** Milliseconds until the key is under its limit again; 0 when it already is. */
    private long retryMs(String key, int max, long windowMs, long now) {
        Deque<Long> q = events.get(key);
        if (q == null) return 0;
        while (!q.isEmpty() && q.peekFirst() <= now - windowMs) q.pollFirst();
        if (q.size() < max) return 0;
        // The (size - max + 1)-th oldest event must expire before a slot frees up.
        long pivot = q.stream().skip(q.size() - max).findFirst().orElse(now);
        return Math.max(1, pivot + windowMs - now);
    }

    private void record(String key, long now) { events.computeIfAbsent(key, k -> new ArrayDeque<>()).addLast(now); }

    private void sweep(long now) {
        if (now - lastSweep < SWEEP_EVERY_MS) return;
        lastSweep = now;
        long oldest = now - Math.max(loginWindowMs, registerWindowMs);
        events.values().removeIf(q -> q.isEmpty() || q.peekLast() <= oldest);
    }
}
