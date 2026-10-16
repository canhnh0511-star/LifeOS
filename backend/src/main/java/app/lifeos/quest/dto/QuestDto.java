package app.lifeos.quest.dto;

import java.time.Instant;
import java.time.LocalDate;

/** Mirrors the contract's `Quest` schema. */
public record QuestDto(String habitId, String goalId, String goalTitle, String title, int targetMinutes, int xpReward,
                       String category, LocalDate date, String status, Instant completedAt) {}
