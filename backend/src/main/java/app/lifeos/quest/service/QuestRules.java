package app.lifeos.quest.service;

import app.lifeos.habit.model.Habit;
import app.lifeos.habit.model.HabitScheduleVersion;
import app.lifeos.lifecycle.model.LifecycleEvent;
import app.lifeos.lifecycle.model.RecordStatus;
import java.time.LocalDate;
import java.util.List;

/**
 * The single definition of "a quest exists for this habit on this date" (DOMAIN_RULES):
 * startDate <= D <= endDate?, the schedule version in force on D includes D's weekday,
 * and both the habit and its goal were ACTIVE on D according to their lifecycle history.
 * Pure functions of history, so a past day gives the same answer no matter what was edited later.
 */
final class QuestRules {
    private QuestRules() {}

    static boolean isScheduled(Habit habit, List<HabitScheduleVersion> versions, LocalDate date) {
        if (date.isBefore(habit.getStartDate())) return false;
        if (habit.getEndDate() != null && date.isAfter(habit.getEndDate())) return false;
        HabitScheduleVersion inForce = null;
        for (HabitScheduleVersion v : versions) if (!v.getEffectiveFrom().isAfter(date)) inForce = v; // versions ascend by effectiveFrom
        return inForce != null && inForce.weekdays().contains(date.getDayOfWeek().getValue());
    }

    /** Latest status in force on `date`; events must ascend by (effectiveDate, createdAt). Records start ACTIVE. */
    static RecordStatus statusOn(List<LifecycleEvent> events, LocalDate date) {
        RecordStatus status = RecordStatus.ACTIVE;
        for (LifecycleEvent e : events) if (!e.getEffectiveDate().isAfter(date)) status = e.getStatus();
        return status;
    }

    static boolean hasQuest(Habit habit, List<HabitScheduleVersion> versions, List<LifecycleEvent> habitEvents, List<LifecycleEvent> goalEvents, LocalDate date) {
        return isScheduled(habit, versions, date)
            && statusOn(habitEvents, date) == RecordStatus.ACTIVE
            && statusOn(goalEvents, date) == RecordStatus.ACTIVE;
    }
}
