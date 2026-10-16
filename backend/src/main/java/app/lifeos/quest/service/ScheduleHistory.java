package app.lifeos.quest.service;

import app.lifeos.goal.model.Goal;
import app.lifeos.habit.model.Habit;
import app.lifeos.habit.model.HabitScheduleVersion;
import app.lifeos.lifecycle.model.LifecycleEvent;
import app.lifeos.lifecycle.model.RecordStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** A user's habits, goals, schedule versions and lifecycle history, loaded once, answering "is there a quest on D?" for any D. */
public final class ScheduleHistory {
    private final List<Habit> habits;
    private final Map<UUID, Goal> goals;
    private final Map<UUID, List<HabitScheduleVersion>> versions;
    private final Map<UUID, List<LifecycleEvent>> events;

    ScheduleHistory(List<Habit> habits, Map<UUID, Goal> goals, Map<UUID, List<HabitScheduleVersion>> versions, Map<UUID, List<LifecycleEvent>> events) {
        this.habits = habits; this.goals = goals; this.versions = versions; this.events = events;
    }

    public List<Habit> habits() { return habits; }
    public Goal goalOf(Habit habit) { return goals.get(habit.getGoalId()); }

    public boolean hasQuest(Habit habit, LocalDate date) {
        Goal goal = goals.get(habit.getGoalId());
        return goal != null && QuestRules.hasQuest(habit, versions.getOrDefault(habit.getId(), List.of()),
            events.getOrDefault(habit.getId(), List.of()), events.getOrDefault(goal.getId(), List.of()), date);
    }

    /** Habit and its goal are both ACTIVE on `date` (ignores the weekly schedule). */
    public boolean isActiveOn(Habit habit, LocalDate date) {
        Goal goal = goals.get(habit.getGoalId());
        return goal != null && QuestRules.statusOn(events.getOrDefault(habit.getId(), List.of()), date) == RecordStatus.ACTIVE
            && QuestRules.statusOn(events.getOrDefault(goal.getId(), List.of()), date) == RecordStatus.ACTIVE;
    }
}
