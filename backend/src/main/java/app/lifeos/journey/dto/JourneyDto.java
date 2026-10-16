package app.lifeos.journey.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Mirrors the contract's `Journey`, `Chapter`, `Boss` schemas. */
public record JourneyDto(String id, String title, LocalDate startDate, int durationDays, int elapsedDays, int totalScheduledToDate,
                         int completedToDate, String status, List<ChapterDto> chapters) {
    public record ChapterDto(int index, String title, LocalDate startDate, LocalDate endDate, BossDto boss, BadgeDto badge) {}
    public record BadgeDto(String code, String name, boolean earned) {}
    public record BossDto(String id, String code, String name, String category, int targetMinutes, int xpReward, int tier, int requiredLevel,
                          int currentAreaLevel, String artKey, LocalDate bossDate, String status, LocalDate defeatedDate, Instant defeatedAt) {}
}
