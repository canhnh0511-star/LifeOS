package app.lifeos.quest.dto;

import java.time.LocalDate;
import java.util.List;

/** Mirrors `QuestMutation`; `objectives` is the quest's checklist after the change (empty for a habit without one). `xpAwarded` is this request's net delta; `streak` is 0 until B-05; `effects` lists achievements granted or revoked by this request (their XP is already in `xpAwarded`). */
public record QuestMutationDto(String habitId, LocalDate date, String status, int xpAwarded, int totalXp, int level, int streak, List<app.lifeos.achievement.dto.RewardEffectDto> effects,
                               List<QuestObjectiveDto> objectives) {}
