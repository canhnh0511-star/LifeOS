package app.lifeos.plan;

import java.util.List;

/**
 * Mirrors the contract's `TrainingPlan` schema: the account's gym plan, or, while `started` is false, the standard plan that
 * POST /plan would create (then `goalId` and every `habitId` are null). `variant` is which version of the standard plan this is (null for a plan whose text
 * was changed), `suggestedVariant` the one the account's body goal calls for; they differ when the goal changed after the plan was started.
 */
public record TrainingPlanDto(boolean started, String goalId, String title, String description, List<Session> sessions, String variant, String suggestedVariant) {
    public record Session(String habitId, String title, int targetMinutes, int xpReward, List<Integer> weekdays, List<Line> objectives) {}

    public record Line(String title, int target, String unit, int step) {}
}
