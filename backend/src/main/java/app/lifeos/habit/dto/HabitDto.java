package app.lifeos.habit.dto;

import app.lifeos.habit.model.Habit;
import java.util.List;

/** Mirrors the contract's `Habit` schema; `weekdays` is the latest schedule version. */
public record HabitDto(String id, String goalId, String title, int targetMinutes, int xpReward, List<Integer> weekdays,
                       String startDate, String endDate, String status, List<HabitObjectiveDto> objectives) {
    public static HabitDto of(Habit h, List<Integer> weekdays, List<HabitObjectiveDto> objectives) {
        return new HabitDto(h.getId().toString(), h.getGoalId().toString(), h.getTitle(), h.getTargetMinutes(), h.getXpReward(), weekdays,
            h.getStartDate().toString(), h.getEndDate() == null ? null : h.getEndDate().toString(), h.getStatus().name(), objectives);
    }
}
