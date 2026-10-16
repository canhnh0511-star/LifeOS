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
import app.lifeos.ledger.repository.XpTransactionRepository;
import app.lifeos.lifecycle.model.LifecycleEvent;
import app.lifeos.lifecycle.repository.LifecycleEventRepository;
import app.lifeos.journey.dto.JourneyDto;
import app.lifeos.journey.service.JourneyService;
import app.lifeos.progress.service.ProgressService;
import app.lifeos.quest.dto.DailyDashboardDto;
import app.lifeos.quest.dto.QuestDto;
import app.lifeos.quest.model.QuestInstance;
import app.lifeos.quest.repository.QuestInstanceRepository;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.ArrayList;
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

    private final ScheduleHistoryLoader loader;
    private final JourneyService journeys;
    private final QuestInstanceRepository instances;
    private final UserRepository users;
    private final ProgressService progress;
    private final XpTransactionRepository ledger;
    private final UserClock clock;

    public QuestService(ScheduleHistoryLoader loader, JourneyService journeys,
                        QuestInstanceRepository instances, UserRepository users, ProgressService progress, XpTransactionRepository ledger, UserClock clock) {
        this.ledger = ledger;
        this.loader = loader; this.journeys = journeys;
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
        return new DailyDashboardDto(day, UserDto.of(user), list, progress.progressFor(userId), completed, list.size(), (int) ledger.sumForDate(userId, day), journeys.current(userId));
    }

    /**
     * Creates (with today's reward) every quest of this habit inside the 7-day edit window that does not exist yet, so a later reward
     * edit cannot change what a lived day is worth. Called right before `xpReward` changes.
     */
    @Transactional
    public void freezeRewards(UUID userId, UUID habitId) {
        User user = users.findById(userId).orElseThrow();
        ScheduleHistory history = loader.load(userId);
        Habit habit = history.habits().stream().filter(h -> h.getId().equals(habitId)).findFirst().orElse(null);
        if (habit == null) return;
        LocalDate today = clock.today(user.getTimezone());
        for (LocalDate d = today.minusDays(7); !d.isAfter(today); d = d.plusDays(1)) {
            if (history.hasQuest(habit, d)) instances.materialize(UUID.randomUUID(), userId, habitId, d, history.goalOf(habit).getCategory().name(), habit.getXpReward(), clock.now());
        }
    }

    private List<QuestDto> questsOn(User user, LocalDate day) {
        UUID userId = user.getId();
        ScheduleHistory history = loader.load(userId);
        boolean lived = !day.isAfter(clock.today(user.getTimezone()));
        List<Habit> due = history.habits().stream().filter(h -> history.hasQuest(h, day)).toList();
        if (due.isEmpty()) return List.of();

        Map<UUID, QuestInstance> stored = new HashMap<>();
        if (lived) {
            for (Habit h : due) {
                int created = instances.materialize(UUID.randomUUID(), userId, h.getId(), day, history.goalOf(h).getCategory().name(), h.getXpReward(), clock.now());
                if (created > 0) log.info("quest.materialized userId={} habitId={} date={}", userId, h.getId(), day);
            }
            instances.findByUserIdAndScheduledDate(userId, day).forEach(q -> stored.put(q.getHabitId(), q));
        }
        return due.stream().map(h -> toDto(h, history.goalOf(h), stored.get(h.getId()), day)).toList();
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
