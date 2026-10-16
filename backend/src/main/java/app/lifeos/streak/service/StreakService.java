package app.lifeos.streak.service;

import app.lifeos.habit.model.Habit;
import app.lifeos.quest.model.QuestInstance;
import app.lifeos.quest.repository.QuestInstanceRepository;
import app.lifeos.quest.service.ScheduleHistory;
import app.lifeos.quest.service.ScheduleHistoryLoader;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Dashboard streak = the best current per-habit streak among habits (and goals) active today; longest = best ever across all habits
 * (ADR-009, the definition the approved UI shows). Computed from history on every read, nothing is stored.
 */
@Service
public class StreakService {
    public record Streaks(int current, int longest) {}

    private final ScheduleHistoryLoader loader;
    private final QuestInstanceRepository instances;

    public StreakService(ScheduleHistoryLoader loader, QuestInstanceRepository instances) { this.loader = loader; this.instances = instances; }

    @Transactional(readOnly = true)
    public Streaks overall(UUID userId, LocalDate today) {
        ScheduleHistory history = loader.load(userId);
        Map<UUID, Set<LocalDate>> done = completedByHabit(userId);
        int current = 0, longest = 0;
        for (Habit h : history.habits()) {
            var r = StreakCalculator.compute(h.getStartDate(), today, done.getOrDefault(h.getId(), Set.of()), d -> history.hasQuest(h, d));
            longest = Math.max(longest, r.longest());
            if (history.isActiveOn(h, today)) current = Math.max(current, r.current());
        }
        return new Streaks(current, longest);
    }

    /** Current streak of one habit, as returned by a quest mutation. */
    @Transactional(readOnly = true)
    public int forHabit(UUID userId, UUID habitId, LocalDate today) {
        ScheduleHistory history = loader.load(userId);
        Habit habit = history.habits().stream().filter(h -> h.getId().equals(habitId)).findFirst().orElse(null);
        if (habit == null) return 0;
        return StreakCalculator.compute(habit.getStartDate(), today, completedByHabit(userId).getOrDefault(habitId, Set.of()), d -> history.hasQuest(habit, d)).current();
    }

    private Map<UUID, Set<LocalDate>> completedByHabit(UUID userId) {
        Map<UUID, Set<LocalDate>> done = new HashMap<>();
        for (QuestInstance q : instances.findByUserIdAndStatus(userId, QuestInstance.Status.COMPLETED)) {
            done.computeIfAbsent(q.getHabitId(), k -> new HashSet<>()).add(q.getScheduledDate());
        }
        return done;
    }
}
