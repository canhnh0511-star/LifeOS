package app.lifeos.achievement.service;

import app.lifeos.achievement.dto.AchievementDto;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Lists the achievement catalog (same as frontend/src/domain/achievements.ts). Granting is not built yet, so every
 * achievement is reported LOCKED with no earnedAt; granting and revoking belong to the RPG layer with their ledger events.
 */
@Service
public class AchievementService {
    private record Entry(String code, String name, String description, int xpReward) {}

    private static final List<Entry> CATALOG = List.of(
        new Entry("STREAK_7", "Bảy phiên liền", "Giữ streak của một thói quen đủ 7 phiên đã lên lịch.", 20),
        new Entry("BALANCED", "Cân bằng", "Cả 5 lĩnh vực đều có nhiệm vụ và hoàn thành từ 60% trong 7 ngày gần nhất.", 30),
        new Entry("COMEBACK", "Trở lại mạnh mẽ", "Sau khi một streak từ 3 phiên bị đứt, hoàn thành lại 3 phiên liên tiếp.", 20));

    public List<AchievementDto> list(UUID userId) {
        return CATALOG.stream().map(e -> new AchievementDto(e.code(), e.name(), e.description(), e.xpReward(), "LOCKED", null)).toList();
    }
}
