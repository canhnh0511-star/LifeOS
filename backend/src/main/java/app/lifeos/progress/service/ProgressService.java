package app.lifeos.progress.service;

import app.lifeos.goal.model.Category;
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
 * Progress is always recomputed from the ledger; nothing is stored. Streaks are still 0 until B-05.
 * Areas list all five categories; totalXp = sum of area XP (DOMAIN_RULES).
 */
@Service
public class ProgressService {
    private final XpTransactionRepository ledger;

    public ProgressService(XpTransactionRepository ledger) { this.ledger = ledger; }

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
        return new ProgressDto(total, level, Levels.startXp(level), Levels.nextXp(level), 0, 0, areas);
    }
}
