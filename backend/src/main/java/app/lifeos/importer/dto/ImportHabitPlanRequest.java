package app.lifeos.importer.dto;

import java.util.List;

/** Validated in HabitPlanImportService by delegating to the goal and habit services, so limits and messages match POST /goals and /habits. */
public record ImportHabitPlanRequest(String startDate, List<PlanGoal> goals) {
    public record PlanGoal(String title, String category, String description, List<PlanHabit> habits) {}

    public record PlanHabit(String title, Integer targetMinutes, Integer xpReward, List<Integer> weekdays, List<java.util.Map<String, Object>> objectives) {}
}
