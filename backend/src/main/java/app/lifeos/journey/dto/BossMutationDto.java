package app.lifeos.journey.dto;

import java.util.List;

/** Mirrors the contract's `BossMutation`. `effects` stays empty until achievements are granted (B-09). */
public record BossMutationDto(String bossId, String status, int xpAwarded, int totalXp, int level, List<Object> effects) {}
