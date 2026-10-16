package app.lifeos.progress.service;

import app.lifeos.goal.model.Category;
import app.lifeos.progress.dto.ProgressDto;
import app.lifeos.progress.dto.ProgressDto.AreaStatDto;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * PLACEHOLDER until B-04 (xp-ledger) and B-05 (streak): there is no ledger yet, so nothing has been earned.
 * Returns the empty-state progress with the real level thresholds (DOMAIN_RULES: level 1 spans 0..399 XP).
 * B-04 replaces the body with a ledger query; the signature already takes the user.
 */
@Service
public class ProgressService {
    private static final int LEVEL_1_START = 0;
    private static final int LEVEL_2_START = 400; // 100 * 2^2

    public ProgressDto progressFor(UUID userId) {
        List<AreaStatDto> areas = Arrays.stream(Category.values()).map(c -> new AreaStatDto(c.name(), 0, 1, LEVEL_1_START, LEVEL_2_START)).toList();
        return new ProgressDto(0, 1, LEVEL_1_START, LEVEL_2_START, 0, 0, areas);
    }
}
