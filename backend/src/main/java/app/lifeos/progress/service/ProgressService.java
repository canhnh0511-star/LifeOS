package app.lifeos.progress.service;

import app.lifeos.common.time.UserClock;
import app.lifeos.goal.model.Category;
import app.lifeos.identity.repository.UserRepository;
import app.lifeos.streak.service.StreakService;
import app.lifeos.ledger.repository.XpTransactionRepository;
import app.lifeos.progress.dto.ProgressDto;
import app.lifeos.progress.dto.ProgressDto.AreaStatDto;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Progress is always recomputed from the ledger; nothing is stored.
 * Areas list all five categories; totalXp = sum of area XP (DOMAIN_RULES).
 */
@Service
public class ProgressService {
    private final XpTransactionRepository ledger;
    private final StreakService streaks;
    private final UserRepository users;
    private final UserClock clock;

    public ProgressService(XpTransactionRepository ledger, StreakService streaks, UserRepository users, UserClock clock) {
        this.ledger = ledger; this.streaks = streaks; this.users = users; this.clock = clock;
    }

    @Transactional(readOnly = true)
    public ProgressDto progressFor(UUID userId) {
        Map<Category, Long> byCategory = new EnumMap<>(Category.class);
        for (Object[] row : ledger.sumByCategory(userId)) byCategory.put((Category) row[0], (Long) row[1]);
        List<AreaStatDto> areas = Arrays.stream(Category.values()).map(c -> {
            long xp = Math.max(0, byCategory.getOrDefault(c, 0L));
            int level = Levels.levelOf(xp);
            return new AreaStatDto(c.name(), (int) xp, level, Levels.startXp(level), Levels.nextXp(level));
        }).toList();
        int total = areas.stream().mapToInt(AreaStatDto::xp).sum();
        int level = Levels.levelOf(total);
        var streak = streaks.overall(userId, clock.today(users.findById(userId).orElseThrow().getTimezone()));
        return new ProgressDto(total, level, Levels.startXp(level), Levels.nextXp(level), streak.current(), streak.longest(), areas);
    }
}
