package app.lifeos.quest.service;

import app.lifeos.common.error.FieldErrors;
import app.lifeos.common.time.UserClock;
import app.lifeos.goal.model.Goal;
import app.lifeos.goal.repository.GoalRepository;
import app.lifeos.habit.model.Habit;
import app.lifeos.habit.model.HabitScheduleVersion;
import app.lifeos.habit.repository.HabitRepository;
import app.lifeos.habit.repository.HabitScheduleVersionRepository;
import app.lifeos.identity.dto.UserDto;
import app.lifeos.identity.model.User;
import app.lifeos.identity.repository.UserRepository;
import app.lifeos.lifecycle.model.LifecycleEvent;
import app.lifeos.lifecycle.repository.LifecycleEventRepository;
import app.lifeos.progress.service.ProgressService;
import app.lifeos.quest.dto.DailyDashboardDto;
import app.lifeos.quest.dto.QuestDto;
import app.lifeos.quest.model.QuestInstance;
import app.lifeos.quest.repository.QuestInstanceRepository;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reads the quests of one local day. Reading never awards XP. A day that has begun (date <= user's today) is
 * materialized into quest_instances so its reward/category snapshot survives later edits; a future day is only
 * previewed from the current definitions and stores nothing (so GET cannot be used to fill the table).
 */
@Service
public class QuestService {
    private static final Logger log = LoggerFactory.getLogger(QuestService.class);

    private final HabitRepository habits;
    private final HabitScheduleVersionRepository schedules;
    private final GoalRepository goals;
    private final LifecycleEventRepository lifecycle;
    private final QuestInstanceRepository instances;
    private final UserRepository users;
    private final ProgressService progress;
    private final UserClock clock;

    public QuestService(HabitRepository habits, HabitScheduleVersionRepository schedules, GoalRepository goals, LifecycleEventRepository lifecycle,
                        QuestInstanceRepository instances, UserRepository users, ProgressService progress, UserClock clock) {
        this.habits = habits; this.schedules = schedules; this.goals = goals; this.lifecycle = lifecycle;
        this.instances = instances; this.users = users; this.progress = progress; this.clock = clock;
    }

    @Transactional
    public List<QuestDto> quests(UUID userId, String date) {
        User user = users.findById(userId).orElseThrow();
        return questsOn(user, parse(date, "date"));
    }

    @Transactional
    public DailyDashboardDto dashboard(UUID userId, String date) {
        User user = users.findById(userId).orElseThrow();
        LocalDate day = date == null ? clock.today(user.getTimezone()) : parse(date, "date");
        List<QuestDto> list = questsOn(user, day);
        int completed = (int) list.stream().filter(q -> "COMPLETED".equals(q.status())).count();
        // Nothing can be earned before B-04's ledger exists.
        return new DailyDashboardDto(day, UserDto.of(user), list, progress.progressFor(userId), completed, list.size(), 0, null);
    }

    private List<QuestDto> questsOn(User user, LocalDate day) {
        UUID userId = user.getId();
        List<Habit> mine = habits.findByUserIdOrderByCreatedAtAsc(userId);
        if (mine.isEmpty()) return List.of();
        Map<UUID, Goal> goalById = goals.findByUserIdOrderByCreatedAtAsc(userId).stream().collect(Collectors.toMap(Goal::getId, g -> g));
        Map<UUID, List<HabitScheduleVersion>> versions = schedules.findByHabitIdInOrderByEffectiveFromAsc(mine.stream().map(Habit::getId).toList())
            .stream().collect(Collectors.groupingBy(HabitScheduleVersion::getHabitId));
        Map<UUID, List<LifecycleEvent>> events = lifecycle.findByUserId(userId).stream()
            .sorted(Comparator.comparing(LifecycleEvent::getEffectiveDate).thenComparing(LifecycleEvent::getCreatedAt))
            .collect(Collectors.groupingBy(LifecycleEvent::getSubjectId));

        boolean lived = !day.isAfter(clock.today(user.getTimezone()));
        List<Habit> due = new ArrayList<>();
        for (Habit h : mine) {
            Goal goal = goalById.get(h.getGoalId());
            if (goal == null) continue;
            boolean has = QuestRules.hasQuest(h, versions.getOrDefault(h.getId(), List.of()), events.getOrDefault(h.getId(), List.of()),
                events.getOrDefault(goal.getId(), List.of()), day);
            if (has) due.add(h);
        }
        if (due.isEmpty()) return List.of();

        Map<UUID, QuestInstance> stored = new HashMap<>();
        if (lived) {
            for (Habit h : due) {
                int created = instances.materialize(UUID.randomUUID(), userId, h.getId(), day, goalById.get(h.getGoalId()).getCategory().name(), h.getXpReward(), clock.now());
                if (created > 0) log.info("quest.materialized userId={} habitId={} date={}", userId, h.getId(), day);
            }
            instances.findByUserIdAndScheduledDate(userId, day).forEach(q -> stored.put(q.getHabitId(), q));
        }
        return due.stream().map(h -> toDto(h, goalById.get(h.getGoalId()), stored.get(h.getId()), day)).toList();
    }

    private static QuestDto toDto(Habit h, Goal goal, QuestInstance q, LocalDate day) {
        // The snapshot wins for reward/category once it exists; a future preview uses the current definitions.
        int reward = q != null ? q.getXpReward() : h.getXpReward();
        String category = (q != null ? q.getCategory() : goal.getCategory()).name();
        return new QuestDto(h.getId().toString(), goal.getId().toString(), goal.getTitle(), h.getTitle(), h.getTargetMinutes(), reward, category,
            day, q != null ? q.getStatus().name() : "PENDING", q != null ? q.getCompletedAt() : null);
    }

    private static LocalDate parse(String value, String field) {
        try {
            if (value != null) return LocalDate.parse(value);
        } catch (DateTimeException ignored) { /* falls through to the 422 */ }
        new FieldErrors().add(field, "Ngày phải có dạng YYYY-MM-DD.").throwIfAny();
        return null;
    }
}
