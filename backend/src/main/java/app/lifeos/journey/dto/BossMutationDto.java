package app.lifeos.journey.dto;

import java.util.List;

/** Mirrors the contract's `BossMutation`. `effects` lists achievements granted or revoked by the same request. */
public record BossMutationDto(String bossId, String status, int xpAwarded, int totalXp, int level, List<app.lifeos.achievement.dto.RewardEffectDto> effects) {}
