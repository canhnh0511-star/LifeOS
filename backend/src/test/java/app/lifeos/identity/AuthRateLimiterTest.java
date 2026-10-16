package app.lifeos.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lifeos.common.error.RateLimitedException;
import app.lifeos.identity.service.AuthRateLimiter;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class AuthRateLimiterTest {
    private static final class MutableClock extends Clock {
        Instant now = Instant.parse("2026-10-16T00:00:00Z");
        public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(java.time.ZoneId z) { return this; }
        public Instant instant() { return now; }
        void advance(Duration d) { now = now.plus(d); }
    }

    private final MutableClock clock = new MutableClock();
    private final AuthRateLimiter limiter = new AuthRateLimiter(clock, 6, 3, Duration.ofMinutes(15), 2, 2, Duration.ofHours(1));

    @Test void blocksAfterEmailThresholdAndReportsRetryAfter() {
        for (int i = 0; i < 3; i++) { limiter.admitLogin("1.1.1.1", "aaa"); clock.advance(Duration.ofSeconds(10)); }
        assertThatThrownBy(() -> limiter.admitLogin("1.1.1.1", "aaa")).isInstanceOf(RateLimitedException.class)
            .satisfies(e -> assertThat(((RateLimitedException) e).retryAfterSeconds()).isEqualTo(15 * 60 - 30)); // oldest attempt frees a slot
    }

    @Test void slidingWindowReopensAfterItExpires() {
        for (int i = 0; i < 3; i++) limiter.admitLogin("1.1.1.1", "aaa");
        assertThatThrownBy(() -> limiter.admitLogin("1.1.1.1", "aaa")).isInstanceOf(RateLimitedException.class);
        clock.advance(Duration.ofMinutes(15));
        limiter.admitLogin("1.1.1.1", "aaa"); // no exception
    }

    @Test void otherIpAndOtherEmailAreIndependent() {
        for (int i = 0; i < 3; i++) limiter.admitLogin("1.1.1.1", "aaa");
        limiter.admitLogin("2.2.2.2", "bbb");
        assertThatThrownBy(() -> limiter.admitLogin("2.2.2.2", "aaa")).isInstanceOf(RateLimitedException.class); // same email from elsewhere: still locked
        limiter.admitLogin("1.1.1.1", "ccc"); // same IP, new email
    }

    @Test void ipLimitBlocksManyEmailsFromOneAddress() {
        for (int i = 0; i < 6; i++) limiter.admitLogin("1.1.1.1", "e" + i);
        assertThatThrownBy(() -> limiter.admitLogin("1.1.1.1", "fresh")).isInstanceOf(RateLimitedException.class);
    }

    @Test void successRefundsItsOwnSlot() {
        limiter.admitLogin("1.1.1.1", "aaa");
        limiter.admitLogin("1.1.1.1", "aaa");
        limiter.loginSucceeded(limiter.admitLogin("1.1.1.1", "aaa"));
        limiter.admitLogin("1.1.1.1", "aaa"); // two failures + this one = 3rd slot used
        assertThatThrownBy(() -> limiter.admitLogin("1.1.1.1", "aaa")).isInstanceOf(RateLimitedException.class);
    }

    @Test void successDoesNotForgiveAnAttackersFailures() {
        limiter.admitLogin("6.6.6.6", "aaa");
        limiter.admitLogin("6.6.6.6", "aaa");
        limiter.loginSucceeded(limiter.admitLogin("1.1.1.1", "aaa")); // the owner gets in; only their own slot is refunded
        limiter.admitLogin("6.6.6.6", "aaa");
        assertThatThrownBy(() -> limiter.admitLogin("6.6.6.6", "aaa")).isInstanceOf(RateLimitedException.class);
    }

    @Test void registerCountsEveryAttempt() {
        limiter.admitRegister("1.1.1.1", "x");
        limiter.admitRegister("1.1.1.1", "y");
        assertThatThrownBy(() -> limiter.admitRegister("1.1.1.1", "z")).isInstanceOf(RateLimitedException.class);
        limiter.admitRegister("9.9.9.9", "z");
    }
}
