package app.lifeos.quest.dto;

import app.lifeos.identity.dto.UserDto;
import app.lifeos.progress.dto.ProgressDto;
import app.lifeos.journey.dto.JourneyDto;
import java.time.LocalDate;
import java.util.List;

/** Mirrors the contract's `DailyDashboard`.  */
public record DailyDashboardDto(LocalDate date, UserDto user, List<QuestDto> quests, ProgressDto progress,
                                int completedCount, int scheduledCount, int earnedXpToday, JourneyDto journey,
                                List<app.lifeos.daily.DailyRewardService.RewardDto> dailyRewards, int dayStreak) {}
