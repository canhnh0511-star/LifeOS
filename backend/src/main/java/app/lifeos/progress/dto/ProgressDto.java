package app.lifeos.progress.dto;

import java.util.List;

/** Mirrors the contract's `Progress` schema. */
public record ProgressDto(int totalXp, int level, int levelStartXp, int nextLevelXp, int currentStreak, int longestStreak, List<AreaStatDto> areas) {
    public record AreaStatDto(String category, int xp, int level, int levelStartXp, int nextLevelXp) {}
}
