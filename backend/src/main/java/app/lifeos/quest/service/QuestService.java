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
import app.lifeos.habit.model.HabitObjective;
import app.lifeos.habit.repository.HabitObjectiveRepository;
import app.lifeos.quest.dto.QuestDto;
import app.lifeos.quest.dto.QuestObjectiveDto;
import app.lifeos.quest.model.QuestObjective;
import app.lifeos.quest.repository.QuestObjectiveRepository;
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
    private final QuestMaterializer materializer;
    private final QuestObjectiveRepository questObjectives;
    private final HabitObjectiveRepository habitObjectives;

    public QuestService(QuestMaterializer materializer, QuestObjectiveRepository questObjectives, HabitObjectiveRepository habitObjectives, ScheduleHistoryLoader loader, JourneyService journeys,
                        QuestInstanceRepository instances, UserRepository users, ProgressService progress, XpTransactionRepository ledger, UserClock clock) {
        this.materializer = materializer; this.questObjectives = questObjectives; this.habitObjectives = habitObjectives;
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
     * Creates (with today's reward and checklist) every quest of this habit inside the 7-day edit window that does not exist yet, so a later
     * edit of the reward or checklist cannot change what a lived day is worth. Called right before `xpReward` or `objectives` change.
     */
    @Transactional
    public void freezeLivedDays(UUID userId, UUID habitId) {
        User user = users.findById(userId).orElseThrow();
        ScheduleHistory history = loader.load(userId);
        Habit habit = history.habits().stream().filter(h -> h.getId().equals(habitId)).findFirst().orElse(null);
        if (habit == null) return;
        LocalDate today = clock.today(user.getTimezone());
        for (LocalDate d = today.minusDays(7); !d.isAfter(today); d = d.plusDays(1)) {
            if (history.hasQuest(habit, d)) materializer.ensure(userId, habit, history.goalOf(habit).getCategory().name(), d);
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
                if (materializer.ensure(userId, h, history.goalOf(h).getCategory().name(), day)) log.info("quest.materialized userId={} habitId={} date={}", userId, h.getId(), day);
            }
            instances.findByUserIdAndScheduledDate(userId, day).forEach(q -> stored.put(q.getHabitId(), q));
        }
        Map<UUID, List<QuestObjectiveDto>> checklists = new HashMap<>();
        if (!stored.isEmpty()) {
            for (QuestObjective o : questObjectives.findByQuestIdInOrderByQuestIdAscPositionAsc(stored.values().stream().map(QuestInstance::getId).toList())) {
                checklists.computeIfAbsent(o.getQuestId(), k -> new ArrayList<>()).add(QuestObjectiveDto.of(o));
            }
        }
        Map<UUID, List<QuestObjectiveDto>> previews = new HashMap<>();
        if (!lived) {
            for (HabitObjective o : habitObjectives.findByHabitIdInOrderByHabitIdAscPositionAsc(due.stream().map(Habit::getId).toList())) {
                previews.computeIfAbsent(o.getHabitId(), k -> new ArrayList<>()).add(QuestObjectiveDto.preview(o));
            }
        }
        return due.stream().map(h -> {
            QuestInstance q = stored.get(h.getId());
            List<QuestObjectiveDto> list = q != null ? checklists.getOrDefault(q.getId(), List.of()) : previews.getOrDefault(h.getId(), List.of());
            return toDto(h, history.goalOf(h), q, day, list);
        }).toList();
    }

    private static QuestDto toDto(Habit h, Goal goal, QuestInstance q, LocalDate day, List<QuestObjectiveDto> objectives) {
        // The snapshot wins for reward/category once it exists; a future preview uses the current definitions.
        int reward = q != null ? q.getXpReward() : h.getXpReward();
        String category = (q != null ? q.getCategory() : goal.getCategory()).name();
        return new QuestDto(h.getId().toString(), goal.getId().toString(), goal.getTitle(), h.getTitle(), h.getTargetMinutes(), reward, category,
            day, q != null ? q.getStatus().name() : "PENDING", q != null ? q.getCompletedAt() : null, objectives);
    }

    private static LocalDate parse(String value, String field) {
        try {
            if (value != null) return LocalDate.parse(value);
        } catch (DateTimeException ignored) { /* falls through to the 422 */ }
        new FieldErrors().add(field, "Ngày phải có dạng YYYY-MM-DD.").throwIfAny();
        return null;
    }
}
