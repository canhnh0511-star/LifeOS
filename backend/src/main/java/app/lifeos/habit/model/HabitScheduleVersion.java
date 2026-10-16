package app.lifeos.habit.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** One immutable weekly schedule, valid from `effectiveFrom` until the next version of the same habit. */
@Entity
@Table(name = "habit_schedule_versions")
public class HabitScheduleVersion {
    @Id private UUID id;
    @Column(name = "habit_id", nullable = false, updatable = false) private UUID habitId;
    @Column(name = "effective_from", nullable = false, updatable = false) private LocalDate effectiveFrom;
    @Column(name = "weekday_mask", nullable = false, updatable = false) private short weekdayMask;

    protected HabitScheduleVersion() {}

    public HabitScheduleVersion(UUID habitId, LocalDate effectiveFrom, Collection<Integer> weekdays) {
        this.id = UUID.randomUUID(); this.habitId = habitId; this.effectiveFrom = effectiveFrom; this.weekdayMask = toMask(weekdays);
    }

    public UUID getHabitId() { return habitId; }
    public LocalDate getEffectiveFrom() { return effectiveFrom; }

    /** ISO weekdays (Mon=1..Sun=7), ascending. */
    public List<Integer> weekdays() {
        List<Integer> days = new ArrayList<>();
        for (int d = 1; d <= 7; d++) if ((weekdayMask & (1 << (d - 1))) != 0) days.add(d);
        return days;
    }

    static short toMask(Collection<Integer> weekdays) {
        int mask = 0;
        for (int d : weekdays) mask |= 1 << (d - 1);
        return (short) mask;
    }
}
