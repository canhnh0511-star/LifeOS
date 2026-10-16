package app.lifeos.quest.service;

import app.lifeos.goal.model.Goal;
import app.lifeos.goal.repository.GoalRepository;
import app.lifeos.habit.model.Habit;
import app.lifeos.habit.model.HabitScheduleVersion;
import app.lifeos.habit.repository.HabitRepository;
import app.lifeos.habit.repository.HabitScheduleVersionRepository;
import app.lifeos.lifecycle.model.LifecycleEvent;
import app.lifeos.lifecycle.repository.LifecycleEventRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class ScheduleHistoryLoader {
    private final HabitRepository habits;
    private final HabitScheduleVersionRepository schedules;
    private final GoalRepository goals;
    private final LifecycleEventRepository lifecycle;

    public ScheduleHistoryLoader(HabitRepository habits, HabitScheduleVersionRepository schedules, GoalRepository goals, LifecycleEventRepository lifecycle) {
        this.habits = habits; this.schedules = schedules; this.goals = goals; this.lifecycle = lifecycle;
    }

    public ScheduleHistory load(UUID userId) {
        List<Habit> mine = habits.findByUserIdOrderByCreatedAtAsc(userId);
        Map<UUID, Goal> goalById = goals.findByUserIdOrderByCreatedAtAsc(userId).stream().collect(Collectors.toMap(Goal::getId, g -> g));
        Map<UUID, List<HabitScheduleVersion>> versions = mine.isEmpty() ? Map.of()
            : schedules.findByHabitIdInOrderByEffectiveFromAsc(mine.stream().map(Habit::getId).toList()).stream().collect(Collectors.groupingBy(HabitScheduleVersion::getHabitId));
        Map<UUID, List<LifecycleEvent>> events = lifecycle.findByUserId(userId).stream()
            .sorted(Comparator.comparing(LifecycleEvent::getEffectiveDate).thenComparing(LifecycleEvent::getCreatedAt))
            .collect(Collectors.groupingBy(LifecycleEvent::getSubjectId));
        return new ScheduleHistory(mine, goalById, versions, events);
    }
}
