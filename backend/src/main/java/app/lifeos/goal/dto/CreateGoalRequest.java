package app.lifeos.goal.dto;

/** Validated in GoalService so messages and field names match the contract (and the mock). */
public record CreateGoalRequest(String title, String category, String description) {}
