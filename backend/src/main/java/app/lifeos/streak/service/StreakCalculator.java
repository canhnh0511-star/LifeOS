package app.lifeos.streak.service;

import java.time.LocalDate;
import java.util.Set;
import java.util.function.Predicate;

/**
 * Scheduled-session streak (DOMAIN_RULES). Only days where a session was required count; unscheduled and paused days are
 * skipped, the first required-but-missed day breaks the run, and a still-pending session today does not break it yet.
 */
public final class StreakCalculator {
    private static final int MAX_LOOKBACK_DAYS = 3650;

    public record Result(int current, int longest) {}

    private StreakCalculator() {}

    public static Result compute(LocalDate startDate, LocalDate reference, Set<LocalDate> completed, Predicate<LocalDate> required) {
        LocalDate from = startDate.isBefore(reference.minusDays(MAX_LOOKBACK_DAYS)) ? reference.minusDays(MAX_LOOKBACK_DAYS) : startDate;
        int run = 0, longest = 0;
        for (LocalDate d = from; !d.isAfter(reference); d = d.plusDays(1)) {
            if (!required.test(d)) continue;
            if (completed.contains(d)) { run++; longest = Math.max(longest, run); }
            else if (!d.equals(reference)) run = 0; // today's pending session may still be done before the day ends
        }
        return new Result(run, longest);
    }
}
