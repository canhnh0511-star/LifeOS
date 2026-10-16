package app.lifeos.achievement.dto;

/** Mirrors the contract's `RewardEffect`: a side effect of a mutation, already included in its `xpAwarded`. */
public record RewardEffectDto(String type, String code, int xpDelta) {}
