package app.lifeos.achievement.service;

import app.lifeos.achievement.dto.AchievementDto;
import app.lifeos.achievement.dto.RewardEffectDto;
import app.lifeos.achievement.model.AchievementState;
import app.lifeos.achievement.repository.AchievementStateRepository;
import app.lifeos.analytics.dto.AnalyticsDto.CategoryStatDto;
import app.lifeos.analytics.service.AnalyticsService;
import app.lifeos.common.time.UserClock;
import app.lifeos.goal.model.Category;
import app.lifeos.habit.model.Habit;
import app.lifeos.identity.model.User;
import app.lifeos.identity.repository.UserRepository;
import app.lifeos.journey.service.JourneyService;
import app.lifeos.ledger.model.XpTransaction;
import app.lifeos.ledger.model.XpTransaction.EventType;
import app.lifeos.ledger.repository.XpTransactionRepository;
import app.lifeos.quest.model.QuestInstance;
import app.lifeos.quest.repository.QuestInstanceRepository;
import app.lifeos.quest.service.ScheduleHistory;
import app.lifeos.quest.service.ScheduleHistoryLoader;
import app.lifeos.streak.service.StreakCalculator;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Achievement catalog, state and granting (ADR-020). {@link #reconcile} is called by quest and boss mutations that really changed
 * state, inside their transaction: it grants achievements whose condition now holds and revokes earned ones that stopped holding
 * while still inside the 7-day editable window and only when the condition no longer held on the day it was earned. Every change is a ledger event, so XP always equals SUM(ledger).
 */
@Service
public class AchievementService {
    private static final Logger log = LoggerFactory.getLogger(AchievementService.class);
    static final int MAX_BACKDATE_DAYS = 7;
    static final int STREAK_TARGET = 7;
    static final int COMEBACK_RUN = 3;
    static final double BALANCED_THRESHOLD = 0.6;

    record Entry(String code, String name, String description, int xpReward) {}

    static final List<Entry> CATALOG = List.of(
        new Entry("STREAK_7", "Bảy phiên liền", "Giữ streak của một thói quen đủ 7 phiên đã lên lịch.", 20),
        new Entry("BALANCED", "Cân bằng", "Cả 5 lĩnh vực đều có nhiệm vụ và hoàn thành từ 60% trong 7 ngày gần nhất.", 30),
        new Entry("COMEBACK", "Trở lại mạnh mẽ", "Sau khi một streak từ 3 phiên bị đứt, hoàn thành lại 3 phiên liên tiếp.", 20));

    private final AchievementStateRepository states;
    private final JourneyService journeys;
    private final ScheduleHistoryLoader loader;
    private final QuestInstanceRepository instances;
    private final AnalyticsService analytics;
    private final XpTransactionRepository ledger;
    private final UserRepository users;
    private final UserClock clock;

    public AchievementService(AchievementStateRepository states, JourneyService journeys, ScheduleHistoryLoader loader, QuestInstanceRepository instances,
                              AnalyticsService analytics, XpTransactionRepository ledger, UserRepository users, UserClock clock) {
        this.states = states; this.journeys = journeys; this.loader = loader; this.instances = instances; this.analytics = analytics;
        this.ledger = ledger; this.users = users; this.clock = clock;
    }

    @Transactional
    public List<AchievementDto> list(UUID userId) {
        Map<String, AchievementState> byCode = new HashMap<>();
        for (AchievementState s : states.findByJourneyId(journeys.journeyIdFor(userId))) byCode.put(s.getCode(), s);
        return CATALOG.stream().map(e -> {
            AchievementState s = byCode.get(e.code());
            boolean earned = s != null && s.isEarned();
            return new AchievementDto(e.code(), e.name(), e.description(), e.xpReward(), earned ? "EARNED" : "LOCKED", earned ? s.getEarnedAt() : null);
        }).toList();
    }

    /** Must run inside the caller's transaction, after its own state change and ledger event were flushed. */
    @Transactional(propagation = Propagation.MANDATORY)
    public List<RewardEffectDto> reconcile(UUID userId) {
        User user = users.findById(userId).orElseThrow();
        LocalDate today = clock.today(user.getTimezone());
        UUID journeyId = journeys.journeyIdFor(userId);
        Map<String, AchievementState> byCode = lockStates(userId, journeyId);

        Instant now = clock.now();
        History h = history(userId);
        Map<LocalDate, Conditions> cache = new HashMap<>();
        List<RewardEffectDto> effects = new ArrayList<>();
        for (Entry e : CATALOG) {
            AchievementState s = byCode.get(e.code());
            if (!s.isEarned()) {
                Conditions met = cache.computeIfAbsent(today, d -> evaluate(userId, h, d));
                if (!met.holds.contains(e.code())) continue;
                s.grant(today, now);
                int total = 0;
                for (Map.Entry<Category, Integer> part : split(e, met.categoryOf.get(e.code())).entrySet()) {
                    ledger.save(XpTransaction.achievement(userId, s.getId(), EventType.ACHIEVEMENT_GRANT, s.getCycle(), part.getKey(), part.getValue(), today, now));
                    total += part.getValue();
                }
                effects.add(new RewardEffectDto("ACHIEVEMENT_GRANTED", e.code(), total));
                log.info("achievement.granted userId={} code={} cycle={} xp={}", userId, e.code(), s.getCycle(), total);
            } else if (ChronoUnit.DAYS.between(s.getEarnedDate(), today) <= MAX_BACKDATE_DAYS) {
                // Revoke only if the condition no longer held on the day it was earned, i.e. an edit inside the window removed what earned it.
                // A streak that merely lapsed since (time passed, a pause) must not take back XP that was legitimately earned.
                if (cache.computeIfAbsent(s.getEarnedDate(), d -> evaluate(userId, h, d)).holds.contains(e.code())) continue;
                int total = 0;
                for (XpTransaction grant : ledger.findBySourceIdAndCycleAndEventType(s.getId(), s.getCycle(), EventType.ACHIEVEMENT_GRANT)) {
                    ledger.save(XpTransaction.achievement(userId, s.getId(), EventType.ACHIEVEMENT_REVOKE, s.getCycle(), grant.getCategory(), -grant.getAmount(), grant.getScheduledDate(), now));
                    total -= grant.getAmount();
                }
                int cycle = s.getCycle();
                s.revoke();
                effects.add(new RewardEffectDto("ACHIEVEMENT_REVOKED", e.code(), total));
                log.info("achievement.revoked userId={} code={} cycle={} xp={}", userId, e.code(), cycle, total);
            }
        }
        states.flush();
        return effects;
    }

    private Map<String, AchievementState> lockStates(UUID userId, UUID journeyId) {
        List<AchievementState> rows = states.findByJourneyIdOrderByCode(journeyId);
        if (rows.size() < CATALOG.size()) {
            for (Entry e : CATALOG) states.ensure(UUID.randomUUID(), userId, journeyId, e.code(), clock.now());
            rows = states.findByJourneyIdOrderByCode(journeyId);
        }
        Map<String, AchievementState> byCode = new HashMap<>();
        for (AchievementState s : rows) byCode.put(s.getCode(), s);
        return byCode;
    }

    /** Which achievements hold right now, and the area credited for the single-area ones (the habit that earned it). */
    private record Conditions(Set<String> holds, Map<String, Category> categoryOf) {}

    /** Schedule history and completed days, loaded once per reconcile and reused for every evaluation date. */
    private record History(ScheduleHistory schedule, Map<UUID, Set<LocalDate>> done) {}

    private History history(UUID userId) {
        Map<UUID, Set<LocalDate>> done = new HashMap<>();
        for (QuestInstance q : instances.findByUserIdAndStatus(userId, QuestInstance.Status.COMPLETED)) {
            done.computeIfAbsent(q.getHabitId(), k -> new HashSet<>()).add(q.getScheduledDate());
        }
        return new History(loader.load(userId), done);
    }

    /** What holds as of the end of `date` (completions after it are ignored by the streak and session walks). */
    private Conditions evaluate(UUID userId, History h, LocalDate date) {
        ScheduleHistory history = h.schedule();
        Set<String> holds = new HashSet<>();
        Map<String, Category> categoryOf = new HashMap<>();
        for (Habit habit : history.habits()) {
            Set<LocalDate> completed = h.done().getOrDefault(habit.getId(), Set.of());
            Category category = history.goalOf(habit).getCategory();
            if (!holds.contains("STREAK_7") && !habit.getStartDate().isAfter(date) && history.isActiveOn(habit, date)
                && StreakCalculator.compute(habit.getStartDate(), date, completed, d -> history.hasQuest(habit, d)).current() >= STREAK_TARGET) {
                holds.add("STREAK_7"); categoryOf.put("STREAK_7", category);
            }
            if (!holds.contains("COMEBACK") && comebackAchieved(sessions(history, habit, completed, date))) {
                holds.add("COMEBACK"); categoryOf.put("COMEBACK", category);
            }
        }
        if (balancedAchieved(analytics.categoriesEnding(userId, date, 7))) holds.add("BALANCED");
        return new Conditions(holds, categoryOf);
    }

    /** One entry per required session, oldest first (true = completed). A pending session today is neither a miss nor a win yet. */
    private static List<Boolean> sessions(ScheduleHistory history, Habit habit, Set<LocalDate> completed, LocalDate today) {
        List<Boolean> out = new ArrayList<>();
        for (LocalDate d = habit.getStartDate(); !d.isAfter(today); d = d.plusDays(1)) {
            if (!history.hasQuest(habit, d)) continue;
            boolean done = completed.contains(d);
            if (d.equals(today) && !done) continue;
            out.add(done);
        }
        return out;
    }

    /** A run of 3+ completions, then at least one miss, then another run of 3+ completions. */
    static boolean comebackAchieved(List<Boolean> sessions) {
        int run = 0;
        boolean broken = false;
        for (boolean done : sessions) {
            if (done) {
                run++;
                if (broken && run >= COMEBACK_RUN) return true;
            } else {
                if (run >= COMEBACK_RUN) broken = true;
                run = 0;
            }
        }
        return false;
    }

    /** Every area has scheduled work and finished at least 60% of it. */
    static boolean balancedAchieved(List<CategoryStatDto> categories) {
        return Arrays.stream(Category.values()).allMatch(c -> categories.stream()
            .anyMatch(s -> s.category().equals(c.name()) && s.scheduled() > 0 && (double) s.completed() / s.scheduled() >= BALANCED_THRESHOLD));
    }

    /** BALANCED splits its reward evenly over the 5 areas (remainder to the first areas); the others pay their one area. */
    private static Map<Category, Integer> split(Entry e, Category single) {
        Map<Category, Integer> parts = new java.util.LinkedHashMap<>();
        if (e.code().equals("BALANCED")) {
            Category[] all = Category.values();
            int base = e.xpReward() / all.length, extra = e.xpReward() - base * all.length;
            for (int i = 0; i < all.length; i++) parts.put(all[i], base + (i < extra ? 1 : 0));
        } else {
            parts.put(single, e.xpReward());
        }
        return parts;
    }
}
