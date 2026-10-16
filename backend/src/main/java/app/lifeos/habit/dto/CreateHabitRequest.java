package app.lifeos.habit.dto;

import java.util.List;

/** Validated in HabitService so messages and field names match the contract (and the mock). */
public record CreateHabitRequest(String goalId, String title, Integer targetMinutes, Integer xpReward, List<Integer> weekdays, String startDate) {}
