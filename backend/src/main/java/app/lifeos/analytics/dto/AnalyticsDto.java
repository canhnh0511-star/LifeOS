package app.lifeos.analytics.dto;

import java.time.LocalDate;
import java.util.List;

/** Mirrors the contract's `Analytics` schema (`previous` omits `days`). */
public record AnalyticsDto(String period, List<DayStatDto> days, int completionRate, int completedCount, int scheduledCount, int earnedXp,
                           List<CategoryStatDto> categories, PreviousPeriodDto previous) {
    public record DayStatDto(LocalDate date, int scheduled, int completed, int xpEarned) {}
    public record CategoryStatDto(String category, int scheduled, int completed) {}
    public record PreviousPeriodDto(int completionRate, int completedCount, int scheduledCount, int earnedXp, List<CategoryStatDto> categories) {}
}
