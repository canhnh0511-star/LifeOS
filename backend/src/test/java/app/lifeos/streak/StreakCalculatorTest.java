package app.lifeos.streak;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.streak.service.StreakCalculator;
import java.time.LocalDate;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

class StreakCalculatorTest {
    // Week of 2028-01-03 (Monday). Thu = 6th, Fri = 7th, Mon = 10th, Tue = 11th.
    private static final LocalDate START = LocalDate.parse("2028-01-03");
    private static final Predicate<LocalDate> WEEKDAYS = d -> d.getDayOfWeek().getValue() <= 5;
    private static final Predicate<LocalDate> DAILY = d -> true;

    private static Set<LocalDate> done(String... dates) { return Stream.of(dates).map(LocalDate::parse).collect(Collectors.toSet()); }
    private static StreakCalculator.Result run(Set<LocalDate> completed, Predicate<LocalDate> required, String today) {
        return StreakCalculator.compute(START, LocalDate.parse(today), completed, required);
    }

    @Test
    void weekendGapDoesNotBreakAWeekdayStreakAndPendingTodayKeepsIt() {
        var r = run(done("2028-01-06", "2028-01-07", "2028-01-10"), WEEKDAYS, "2028-01-11"); // Tue pending
        assertThat(r.current()).isEqualTo(3);
    }

    @Test
    void aMissedScheduledSessionBreaksTheStreak() {
        var r = run(done("2028-01-07", "2028-01-10"), WEEKDAYS, "2028-01-11"); // Thu missed
        assertThat(r.current()).isEqualTo(2);
    }

    @Test
    void dailyHabitWithYesterdayMissedAndTodayPendingIsZero() {
        assertThat(run(done("2028-01-08"), DAILY, "2028-01-10").current()).isZero(); // 9th missed, 10th pending
    }

    @Test
    void completingTodayCountsIt() {
        assertThat(run(done("2028-01-06", "2028-01-07", "2028-01-10", "2028-01-11"), WEEKDAYS, "2028-01-11").current()).isEqualTo(4);
    }

    @Test
    void unscheduledReferenceDayIsSkippedNotCounted() {
        assertThat(run(done("2028-01-06", "2028-01-07"), WEEKDAYS, "2028-01-08").current()).isEqualTo(2); // Saturday
    }

    @Test
    void pausedDaysAreNotRequiredSoTheyNeitherBreakNorExtend() {
        Predicate<LocalDate> pausedOn8And9 = d -> !d.equals(LocalDate.parse("2028-01-08")) && !d.equals(LocalDate.parse("2028-01-09"));
        var r = run(done("2028-01-06", "2028-01-07"), pausedOn8And9, "2028-01-10"); // 10th pending
        assertThat(r.current()).isEqualTo(2);
    }

    @Test
    void longestKeepsTheBestPastRunAfterABreak() {
        var r = run(done("2028-01-03", "2028-01-04", "2028-01-05", "2028-01-07", "2028-01-10"), WEEKDAYS, "2028-01-11");
        assertThat(r.longest()).isEqualTo(3);
        assertThat(r.current()).isEqualTo(2); // Fri 7th was done, Thu 6th missed, then Mon 10th done: 7th + 10th
    }

    @Test
    void nothingDoneMeansZero() {
        var r = run(done(), DAILY, "2028-01-10");
        assertThat(r.current()).isZero();
        assertThat(r.longest()).isZero();
    }

    @Test
    void leapDayIsJustAnotherSession() {
        var r = StreakCalculator.compute(LocalDate.parse("2028-02-27"), LocalDate.parse("2028-03-01"), done("2028-02-27", "2028-02-28", "2028-02-29", "2028-03-01"), DAILY);
        assertThat(r.current()).isEqualTo(4);
    }
}
