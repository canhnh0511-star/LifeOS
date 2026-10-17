package app.lifeos.quest.service;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.habit.model.Habit;
import app.lifeos.habit.model.HabitScheduleVersion;
import app.lifeos.lifecycle.model.LifecycleEvent;
import app.lifeos.lifecycle.model.RecordStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class QuestRulesTest {
    private static final UUID USER = UUID.randomUUID();
    private static final Instant T = Instant.parse("2028-01-01T00:00:00Z");

    private static Habit habit(String start) { return new Habit(USER, UUID.randomUUID(), "h", 30, 35, LocalDate.parse(start), T); }
    private static HabitScheduleVersion version(Habit h, String from, Integer... days) { return new HabitScheduleVersion(h.getId(), LocalDate.parse(from), List.of(days)); }
    private static LifecycleEvent event(UUID subject, String from, RecordStatus s) {
        return new LifecycleEvent(USER, LifecycleEvent.Subject.HABIT, subject, LocalDate.parse(from), s, T);
    }
    private static boolean on(Habit h, List<HabitScheduleVersion> v, List<LifecycleEvent> he, List<LifecycleEvent> ge, String date) {
        return QuestRules.hasQuest(h, v, he, ge, LocalDate.parse(date));
    }

    @Test
    void weekdaysOnlyScheduleSkipsTheWeekend() {
        Habit h = habit("2027-12-27"); // a Monday
        var v = List.of(version(h, "2027-12-27", 1, 2, 3, 4, 5));
        assertThat(on(h, v, List.of(), List.of(), "2027-12-31")).isTrue();  // Friday
        assertThat(on(h, v, List.of(), List.of(), "2028-01-01")).isFalse(); // Saturday
        assertThat(on(h, v, List.of(), List.of(), "2028-01-02")).isFalse(); // Sunday
        assertThat(on(h, v, List.of(), List.of(), "2028-01-03")).isTrue();  // Monday
    }

    @Test
    void leapDayExistsOnlyWhenScheduled() {
        Habit h = habit("2028-01-01");
        var tuesdays = List.of(version(h, "2028-01-01", 2));
        assertThat(on(h, tuesdays, List.of(), List.of(), "2028-02-29")).isTrue();  // Tuesday, leap day
        assertThat(on(h, tuesdays, List.of(), List.of(), "2028-02-28")).isFalse(); // Monday
        assertThat(on(h, tuesdays, List.of(), List.of(), "2028-03-01")).isFalse(); // Wednesday
        assertThat(on(h, tuesdays, List.of(), List.of(), "2029-02-27")).isTrue();  // Tuesday; 2029 has no Feb 29
    }

    @Test
    void notBeforeStartDate() {
        Habit h = habit("2028-01-10");
        var v = List.of(version(h, "2028-01-10", 1, 2, 3, 4, 5, 6, 7));
        assertThat(on(h, v, List.of(), List.of(), "2028-01-09")).isFalse();
        assertThat(on(h, v, List.of(), List.of(), "2028-01-10")).isTrue();
    }

    @Test
    void aNewScheduleVersionNeverRewritesEarlierDays() {
        Habit h = habit("2028-01-03"); // Monday
        var v = List.of(version(h, "2028-01-03", 1), version(h, "2028-01-17", 3)); // Mondays, then Wednesdays from 17 Jan
        assertThat(on(h, v, List.of(), List.of(), "2028-01-10")).isTrue();  // Monday under v1
        assertThat(on(h, v, List.of(), List.of(), "2028-01-12")).isFalse(); // Wednesday under v1
        assertThat(on(h, v, List.of(), List.of(), "2028-01-17")).isFalse(); // Monday, v2 is in force
        assertThat(on(h, v, List.of(), List.of(), "2028-01-19")).isTrue();  // Wednesday under v2
    }

    @Test
    void pauseAppliesFromItsEffectiveDateAndResumeRestoresIt() {
        Habit h = habit("2028-01-03");
        var v = List.of(version(h, "2028-01-03", 1, 2, 3, 4, 5, 6, 7));
        var he = List.of(event(h.getId(), "2028-01-06", RecordStatus.PAUSED), event(h.getId(), "2028-01-09", RecordStatus.ACTIVE));
        assertThat(on(h, v, he, List.of(), "2028-01-05")).isTrue();  // before the pause: history intact
        assertThat(on(h, v, he, List.of(), "2028-01-06")).isFalse();
        assertThat(on(h, v, he, List.of(), "2028-01-08")).isFalse();
        assertThat(on(h, v, he, List.of(), "2028-01-09")).isTrue();
    }

    @Test
    void aPausedOrArchivedGoalSuppressesItsHabits() {
        Habit h = habit("2028-01-03");
        var v = List.of(version(h, "2028-01-03", 1, 2, 3, 4, 5, 6, 7));
        var ge = List.of(event(h.getGoalId(), "2028-01-06", RecordStatus.ARCHIVED));
        assertThat(on(h, v, List.of(), ge, "2028-01-05")).isTrue();
        assertThat(on(h, v, List.of(), ge, "2028-01-06")).isFalse();
    }
}
