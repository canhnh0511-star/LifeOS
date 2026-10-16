package app.lifeos.achievement.dto;

import java.time.Instant;

/** Mirrors the contract's `Achievement` schema. */
public record AchievementDto(String code, String name, String description, int xpReward, String status, Instant earnedAt) {}
