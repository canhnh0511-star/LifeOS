package app.lifeos.quest.service;

import app.lifeos.achievement.dto.RewardEffectDto;
import app.lifeos.achievement.service.AchievementService;
import app.lifeos.common.error.ApiException;
import app.lifeos.common.error.FieldErrors;
import app.lifeos.common.time.UserClock;
import app.lifeos.goal.model.Goal;
import app.lifeos.goal.repository.GoalRepository;
import app.lifeos.habit.model.Habit;
import app.lifeos.habit.repository.HabitRepository;
import app.lifeos.habit.repository.HabitScheduleVersionRepository;
import app.lifeos.identity.model.User;
import app.lifeos.identity.repository.UserRepository;
import app.lifeos.ledger.model.XpTransaction;
import app.lifeos.ledger.model.XpTransaction.EventType;
import app.lifeos.ledger.repository.XpTransactionRepository;
import app.lifeos.lifecycle.model.LifecycleEvent;
import app.lifeos.lifecycle.model.RecordStatus;
import app.lifeos.lifecycle.repository.LifecycleEventRepository;
import app.lifeos.progress.dto.ProgressDto;
import app.lifeos.progress.service.ProgressService;
import app.lifeos.quest.dto.QuestMutationDto;
import app.lifeos.streak.service.StreakService;
import app.lifeos.quest.model.QuestInstance;
import app.lifeos.quest.repository.QuestInstanceRepository;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Complete / undo one quest. Everything (validation, row lock, state change, ledger event) runs in one transaction:
 * either all of it happens or none. Idempotency is by resulting state: asking for the state a quest is already in
 * changes nothing and returns xpAwarded = 0, even when two identical requests race (the second waits on the row lock).
 */
@Service
public class QuestCompletionService {
    private static final Logger log = LoggerFactory.getLogger(QuestCompletionService.class);
    static final int MAX_BACKDATE_DAYS = 7;

    private final HabitRepository habits;
    private final HabitScheduleVersionRepository schedules;
    private final GoalRepository goals;
    private final LifecycleEventRepository lifecycle;
    private final QuestInstanceRepository instances;
    private final XpTransactionRepository ledger;
    private final UserRepository users;
    private final ProgressService progress;
    private final UserClock clock;
    private final StreakService streaks;
    private final AchievementService achievements;

    public QuestCompletionService(HabitRepository habits, HabitScheduleVersionRepository schedules, GoalRepository goals, LifecycleEventRepository lifecycle,
                                  QuestInstanceRepository instances, XpTransactionRepository ledger, UserRepository users, ProgressService progress, StreakService streaks, AchievementService achievements, UserClock clock) {
        this.streaks = streaks; this.achievements = achievements;
        this.habits = habits; this.schedules = schedules; this.goals = goals; this.lifecycle = lifecycle;
        this.instances = instances; this.ledger = ledger; this.users = users; this.progress = progress; this.clock = clock;
    }

    @Transactional
    public QuestMutationDto complete(UUID userId, String habitId, String date) { return mutate(userId, habitId, date, true); }

    @Transactional
    public QuestMutationDto undo(UUID userId, String habitId, String date) { return mutate(userId, habitId, date, false); }

    private QuestMutationDto mutate(UUID userId, String habitIdText, String dateText, boolean complete) {
        LocalDate day = parseDate(dateText);
        Habit habit = findHabit(userId, habitIdText);
        User user = users.findById(userId).orElseThrow();
        Goal goal = goals.findByIdAndUserId(habit.getGoalId(), userId).orElseThrow(() -> FieldErrors.notFound("mục tiêu"));

        LocalDate today = clock.today(user.getTimezone());
        if (day.isAfter(today)) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "QUEST_IN_FUTURE", "Chưa thể hoàn thành nhiệm vụ trong tương lai.");
        if (ChronoUnit.DAYS.between(day, today) > MAX_BACKDATE_DAYS) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "QUEST_TOO_OLD", "Chỉ có thể điều chỉnh nhiệm vụ trong 7 ngày gần nhất.");
        }
        var versions = schedules.findByHabitIdInOrderByEffectiveFromAsc(List.of(habit.getId()));
        if (!QuestRules.isScheduled(habit, versions, day)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "QUEST_OUTSIDE_SCHEDULE", "Ngày này không thuộc lịch thực hiện của thói quen.");
        }
        List<LifecycleEvent> habitEvents = lifecycle.findBySubjectTypeAndSubjectIdOrderByEffectiveDateAscCreatedAtAsc(LifecycleEvent.Subject.HABIT, habit.getId());
        List<LifecycleEvent> goalEvents = lifecycle.findBySubjectTypeAndSubjectIdOrderByEffectiveDateAscCreatedAtAsc(LifecycleEvent.Subject.GOAL, goal.getId());
        if (QuestRules.statusOn(habitEvents, day) != RecordStatus.ACTIVE || QuestRules.statusOn(goalEvents, day) != RecordStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "QUEST_NOT_ACTIVE", "Thói quen hoặc mục tiêu đang tạm dừng vào ngày này.");
        }

        instances.materialize(UUID.randomUUID(), userId, habit.getId(), day, goal.getCategory().name(), habit.getXpReward(), clock.now());
        QuestInstance quest = instances.findByUserIdAndHabitIdAndScheduledDate(userId, habit.getId(), day).orElseThrow(); // takes the row lock

        int delta = 0;
        boolean changed = false;
        if (complete && quest.getStatus() == QuestInstance.Status.PENDING) {
            changed = true;
            quest.complete(clock.now());
            delta = quest.getXpReward();
            if (delta > 0) ledger.save(new XpTransaction(userId, quest.getId(), EventType.QUEST_COMPLETE, quest.getCycle(), quest.getCategory(), delta, day, clock.now()));
        } else if (!complete && quest.getStatus() == QuestInstance.Status.COMPLETED) {
            changed = true;
            // Reverse exactly what this cycle earned, never the habit's current reward.
            int earned = ledger.completeAmount(quest.getId(), quest.getCycle()).orElse(0);
            if (earned > 0) {
                delta = -earned;
                ledger.save(new XpTransaction(userId, quest.getId(), EventType.QUEST_REVERT, quest.getCycle(), quest.getCategory(), delta, day, clock.now()));
            }
            quest.revert();
        }
        instances.flush();
        // Only a real transition re-evaluates achievements; an idempotent repeat changes nothing and awards nothing.
        List<RewardEffectDto> effects = changed ? achievements.reconcile(userId) : List.of();
        delta += effects.stream().mapToInt(RewardEffectDto::xpDelta).sum();
        ProgressDto p = progress.progressFor(userId);
        if (p.totalXp() < 0) throw new IllegalStateException("negative XP total"); // rolls the whole mutation back
        if (delta != 0 || (complete && quest.getStatus() == QuestInstance.Status.COMPLETED)) {
            log.info("quest.{} userId={} habitId={} date={} cycle={} xpDelta={}", complete ? "completed" : "reverted", userId, habit.getId(), day, quest.getCycle(), delta);
        }
        return new QuestMutationDto(habit.getId().toString(), day, quest.getStatus().name(), delta, p.totalXp(), p.level(), streaks.forHabit(userId, habit.getId(), today), effects);
    }

    private Habit findHabit(UUID userId, String habitId) {
        try { return habits.findByIdAndUserId(UUID.fromString(habitId), userId).orElseThrow(() -> FieldErrors.notFound("thói quen")); }
        catch (IllegalArgumentException e) { throw FieldErrors.notFound("thói quen"); }
    }

    private static LocalDate parseDate(String value) {
        try { return LocalDate.parse(value); }
        catch (DateTimeException e) { new FieldErrors().add("date", "Ngày phải có dạng YYYY-MM-DD.").throwIfAny(); return null; }
    }
}
