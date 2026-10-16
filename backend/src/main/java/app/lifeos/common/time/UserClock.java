package app.lifeos.common.time;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Component;

/** "Today" is always the authenticated user's local date; instants are UTC (DOMAIN_RULES). */
@Component
public class UserClock {
    private final Clock clock;

    public UserClock(Clock clock) { this.clock = clock; }

    public LocalDate today(String timezone) { return LocalDate.now(clock.withZone(ZoneId.of(timezone))); }

    /** Millisecond precision, like the frontend's `toISOString()`. */
    public Instant now() { return Instant.now(clock).truncatedTo(ChronoUnit.MILLIS); }
}
