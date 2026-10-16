package app.lifeos.quest.dto;

import app.lifeos.identity.dto.UserDto;
import app.lifeos.progress.dto.ProgressDto;
import java.time.LocalDate;
import java.util.List;

/** Mirrors the contract's `DailyDashboard`. `journey` stays null until B-05. */
public record DailyDashboardDto(LocalDate date, UserDto user, List<QuestDto> quests, ProgressDto progress,
                                int completedCount, int scheduledCount, int earnedXpToday, Object journey) {}
