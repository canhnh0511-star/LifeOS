package app.lifeos.journey.service;

import app.lifeos.common.error.ApiException;
import app.lifeos.common.error.FieldErrors;
import app.lifeos.common.time.UserClock;
import app.lifeos.goal.model.Category;
import app.lifeos.identity.model.User;
import app.lifeos.identity.repository.UserRepository;
import app.lifeos.journey.dto.BossMutationDto;
import app.lifeos.journey.model.BossState;
import app.lifeos.journey.model.Journey;
import app.lifeos.journey.repository.BossStateRepository;
import app.lifeos.ledger.model.XpTransaction;
import app.lifeos.ledger.model.XpTransaction.EventType;
import app.lifeos.ledger.repository.XpTransactionRepository;
import app.lifeos.progress.dto.ProgressDto;
import app.lifeos.progress.service.Levels;
import app.lifeos.progress.service.ProgressService;
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
 * Defeat / undo one boss. Same shape as quest completion: one transaction, a row lock on the boss state, idempotent by
 * resulting state, and the ledger event written together with the state change. The level requirement is checked only
 * when a fight starts; a defeated boss keeps its status if the area level drops afterwards (DOMAIN_RULES).
 */
@Service
public class BossService {
    private static final Logger log = LoggerFactory.getLogger(BossService.class);
    static final int MAX_BACKDATE_DAYS = 7;

    private final BossStateRepository states;
    private final JourneyService journeys;
    private final XpTransactionRepository ledger;
    private final UserRepository users;
    private final ProgressService progress;
    private final UserClock clock;

    public BossService(BossStateRepository states, JourneyService journeys, XpTransactionRepository ledger, UserRepository users, ProgressService progress, UserClock clock) {
        this.states = states; this.journeys = journeys; this.ledger = ledger; this.users = users; this.progress = progress; this.clock = clock;
    }

    @Transactional
    public BossMutationDto defeat(UUID userId, String bossId) { return mutate(userId, bossId, true); }

    @Transactional
    public BossMutationDto undo(UUID userId, String bossId) { return mutate(userId, bossId, false); }

    private BossMutationDto mutate(UUID userId, String bossId, boolean defeat) {
        BossCatalog.Boss boss = BossCatalog.BOSSES.stream().filter(b -> BossCatalog.idOf(b).equals(bossId)).findFirst()
            .orElseThrow(() -> FieldErrors.notFound("boss"));
        User user = users.findById(userId).orElseThrow();
        Journey journey = journeys.journeyOf(user);
        LocalDate today = clock.today(user.getTimezone());
        Category category = Category.valueOf(boss.category());

        // A row exists only once a boss has been fought, so undoing a boss that never was creates nothing.
        if (defeat) states.ensure(UUID.randomUUID(), userId, journey.getId(), boss.code(), clock.now());
        BossState state = states.findByJourneyIdAndBossCode(journey.getId(), boss.code()).orElse(null); // takes the row lock
        if (state == null) return result(userId, boss, bossId, null, 0);

        int delta = 0;
        if (defeat && !state.isDefeated()) {
            if (areaLevel(userId, category) < boss.requiredLevel()) {
                throw new ApiException(HttpStatus.CONFLICT, "BOSS_LOCKED", "Boss chưa mở khóa: cần level " + boss.requiredLevel() + " ở lĩnh vực này.");
            }
            state.defeat(today, clock.now());
            delta = boss.xpReward();
            ledger.save(XpTransaction.boss(userId, state.getId(), EventType.BOSS_COMPLETE, state.getCycle(), category, delta, today, clock.now()));
        } else if (!defeat && state.isDefeated()) {
            if (ChronoUnit.DAYS.between(state.getDefeatedDate(), today) > MAX_BACKDATE_DAYS) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "QUEST_TOO_OLD", "Chỉ có thể điều chỉnh trong 7 ngày gần nhất.");
            }
            // Reverse exactly what this cycle earned, booked on the day of the defeat so per-day totals stay balanced.
            int earned = ledger.bossCompleteAmount(state.getId(), state.getCycle()).orElse(0);
            if (earned > 0) {
                delta = -earned;
                ledger.save(XpTransaction.boss(userId, state.getId(), EventType.BOSS_REVERT, state.getCycle(), category, delta, state.getDefeatedDate(), clock.now()));
            }
            state.revert();
        }
        states.flush();
        if (delta != 0) log.info("boss.{} userId={} boss={} cycle={} xpDelta={}", defeat ? "defeated" : "reverted", userId, boss.code(), state.getCycle(), delta);
        return result(userId, boss, bossId, state, delta);
    }

    private BossMutationDto result(UUID userId, BossCatalog.Boss boss, String bossId, BossState state, int delta) {
        ProgressDto p = progress.progressFor(userId);
        if (p.totalXp() < 0) throw new IllegalStateException("negative XP total"); // rolls the whole mutation back
        int level = p.areas().stream().filter(a -> a.category().equals(boss.category())).findFirst().orElseThrow().level();
        String status = state != null && state.isDefeated() ? "DEFEATED" : level >= boss.requiredLevel() ? "AVAILABLE" : "LOCKED";
        return new BossMutationDto(bossId, status, delta, p.totalXp(), p.level(), List.of());
    }

    /** Area level straight from the ledger (no streak work), used only for the start-of-fight check. */
    private int areaLevel(UUID userId, Category category) {
        long xp = 0;
        for (Object[] row : ledger.sumByCategory(userId)) if (row[0] == category) xp = (Long) row[1];
        return Levels.levelOf(Math.max(0, xp));
    }
}
