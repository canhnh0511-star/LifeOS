package app.lifeos.goal.dto;

import app.lifeos.goal.model.Goal;

/** Mirrors the contract's `Goal` schema. */
public record GoalDto(String id, String title, String category, String description, String status, String createdAt) {
    public static GoalDto of(Goal g) {
        return new GoalDto(g.getId().toString(), g.getTitle(), g.getCategory().name(), g.getDescription(), g.getStatus().name(), g.getCreatedAt().toString());
    }
}
