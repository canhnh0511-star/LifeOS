package app.lifeos.daily;

import app.lifeos.achievement.dto.RewardEffectDto;
import app.lifeos.goal.model.Category;
import app.lifeos.habit.model.Habit;
import app.lifeos.ledger.model.XpTransaction;
import app.lifeos.ledger.model.XpTransaction.EventType;
import app.lifeos.ledger.repository.XpTransactionRepository;
import app.lifeos.quest.model.QuestInstance;
import app.lifeos.quest.repository.QuestInstanceRepository;
import app.lifeos.quest.service.ScheduleHistory;
import app.lifeos.quest.service.ScheduleHistoryLoader;
import app.lifeos.common.time.UserClock;
import jakarta.persistence.EntityManager;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
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
 * Daily reward chests (ADR-033) and the day streak. A chest opens when the day's completed share of its scheduled quests reaches
 * 50% / 80% / 100% (rounded up) and is a ledger event per area, so it is revoked by an undo that drops below the threshold.
 * Nothing but the ledger is stored; the day streak is recomputed from history on every read (ADR-026).
 */
@Service
public class DailyRewardService {
    private static final Logger log = LoggerFactory.getLogger(DailyRewardService.class);

    public record Tier(String tier, int percent, int xp) {}
    static final List<Tier> TIERS = List.of(new Tier("WOOD", 50, 10), new Tier("SILVER", 80, 20), new Tier("GOLD", 100, 40));
    /** Mirrors the contract's `DailyReward`: `threshold` is the number of completed quests that opens the chest. */
    public record RewardDto(String tier, int threshold, int xp, String state, String itemCode) {}

    private final ScheduleHistoryLoader loader;
    private final QuestInstanceRepository instances;
    private final XpTransactionRepository ledger;
    private final UserClock clock;
    private final EntityManager em;
    private final boolean enabled;
    private final app.lifeos.loot.service.LootService loot;

    public DailyRewardService(ScheduleHistoryLoader loader, QuestInstanceRepository instances, XpTransactionRepository ledger, UserClock clock, EntityManager em, app.lifeos.loot.service.LootService loot,
                              @org.springframework.beans.factory.annotation.Value("${lifeos.daily-rewards.enabled:true}") boolean enabled) {
        this.enabled = enabled; this.loot = loot;
        this.loader = loader; this.instances = instances; this.ledger = ledger; this.clock = clock; this.em = em;
    }

    /** Quests needed to open a chest: the share of `scheduled`, rounded up. */
    static int threshold(int scheduled, int percent) { return (scheduled * percent + 99) / 100; }

    private record Counts(int scheduled, int completed) {}

    private Counts counts(UUID userId, ScheduleHistory history, LocalDate day) {
        Set<UUID> due = new HashSet<>();
        for (Habit h : history.habits()) if (history.hasQuest(h, day)) due.add(h.getId());
        int done = 0;
        for (QuestInstance q : instances.findByUserIdAndScheduledDate(userId, day)) {
            if (q.getStatus() == QuestInstance.Status.COMPLETED && due.contains(q.getHabitId())) done++;
        }
        return new Counts(due.size(), done);
    }

    private static UUID sourceId(UUID userId, LocalDate day, Tier t) {
        return UUID.nameUUIDFromBytes(("daily:" + userId + ":" + day + ":" + t.tier()).getBytes(StandardCharsets.UTF_8));
    }

    private boolean granted(UUID source) {
        Category probe = Category.values()[0];
        return ledger.countEvents(source, EventType.DAILY_REWARD_GRANT, probe) > ledger.countEvents(source, EventType.DAILY_REWARD_REVOKE, probe);
    }

    /** The chests of one day with their real state (from the ledger), for the dashboard. */
    @Transactional(readOnly = true)
    public List<RewardDto> rewards(UUID userId, LocalDate day) {
        int scheduled = counts(userId, loader.load(userId), day).scheduled();
        if (scheduled == 0) return List.of();
        return TIERS.stream().map(t -> new RewardDto(t.tier(), threshold(scheduled, t.percent()), t.xp(), granted(sourceId(userId, day, t)) ? "EARNED" : "LOCKED", loot.itemFor(userId, day, t.tier()).orElse(null))).toList();
    }

    /** Run inside the caller's quest transaction, after its own change was flushed: grants chests now reached, revokes chests no longer reached. */
    @Transactional(propagation = Propagation.MANDATORY)
    public List<RewardEffectDto> reconcile(UUID userId, LocalDate day) {
        if (!enabled) return List.of(); // test seam only: lets suites about other rules keep exact XP totals; always on in production
        // Two quests of the same day can finish at the same moment; the lock makes the second one see the first one's chest.
        em.createNativeQuery("select pg_advisory_xact_lock(hashtext(:k))").setParameter("k", "daily:" + userId).getSingleResult();
        Counts c = counts(userId, loader.load(userId), day);
        List<RewardEffectDto> effects = new ArrayList<>();
        for (Tier t : TIERS) {
            UUID source = sourceId(userId, day, t);
            boolean want = c.scheduled() > 0 && c.completed() >= threshold(c.scheduled(), t.percent());
            boolean have = granted(source);
            if (want == have) continue;
            Category[] areas = Category.values();
            long cycle = ledger.countEvents(source, EventType.DAILY_REWARD_GRANT, areas[0]) + (want ? 1 : 0);
            int each = t.xp() / areas.length;
            for (Category a : areas) {
                ledger.save(XpTransaction.daily(userId, source, want ? EventType.DAILY_REWARD_GRANT : EventType.DAILY_REWARD_REVOKE, (int) cycle, a, want ? each : -each, day, clock.now()));
            }
            effects.add(new RewardEffectDto(want ? "DAILY_REWARD_GRANTED" : "DAILY_REWARD_REVOKED", t.tier(), want ? t.xp() : -t.xp()));
            // The chest's item goes and comes with the chest (no XP involved, so xpDelta is 0).
            if (want) loot.drop(userId, day, t.tier()).ifPresent(code -> effects.add(new RewardEffectDto("ITEM_DROPPED", code, 0)));
            else loot.revoke(userId, day, t.tier()).ifPresent(code -> effects.add(new RewardEffectDto("ITEM_REVOKED", code, 0)));
            log.info("daily.{} userId={} date={} tier={} cycle={}", want ? "granted" : "revoked", userId, day, t.tier(), cycle);
        }
        ledger.flush();
        return effects;
    }

    /**
     * Consecutive days (ending today) on which at least 50% of the scheduled quests were done. A day without quests is skipped, and
     * today only counts once it reaches the mark, without breaking the chain while it is still short.
     */
    @Transactional(readOnly = true)
    public int dayStreak(UUID userId, LocalDate today) {
        ScheduleHistory history = loader.load(userId);
        LocalDate first = history.habits().stream().map(Habit::getStartDate).min(LocalDate::compareTo).orElse(today);
        Map<LocalDate, Set<UUID>> done = new HashMap<>();
        for (QuestInstance q : instances.findByUserIdAndStatus(userId, QuestInstance.Status.COMPLETED)) {
            done.computeIfAbsent(q.getScheduledDate(), k -> new HashSet<>()).add(q.getHabitId());
        }
        int streak = 0;
        for (LocalDate d = today; !d.isBefore(first); d = d.minusDays(1)) {
            final LocalDate day = d;
            List<Habit> due = history.habits().stream().filter(h -> history.hasQuest(h, day)).toList();
            if (due.isEmpty()) continue;
            Set<UUID> doneToday = done.getOrDefault(d, Set.of());
            long completed = due.stream().filter(h -> doneToday.contains(h.getId())).count();
            if (completed >= threshold(due.size(), TIERS.get(0).percent())) streak++;
            else if (!d.equals(today)) break;
        }
        return streak;
    }
}
