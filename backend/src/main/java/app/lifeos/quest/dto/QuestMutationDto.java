package app.lifeos.quest.dto;

import java.time.LocalDate;
import java.util.List;

/** Mirrors `QuestMutation`. `xpAwarded` is this request's net delta; `streak` is 0 until B-05; `effects` is empty until the RPG layer. */
public record QuestMutationDto(String habitId, LocalDate date, String status, int xpAwarded, int totalXp, int level, int streak, List<Object> effects) {}
