package app.lifeos.habit.dto;

import app.lifeos.habit.model.HabitObjective;

/** Mirrors the contract's `HabitObjective`: one line of a habit's checklist. */
public record HabitObjectiveDto(String id, String title, int target, String unit, int step) {
    public static HabitObjectiveDto of(HabitObjective o) { return new HabitObjectiveDto(o.getId().toString(), o.getTitle(), o.getTarget(), o.getUnit(), o.getStep()); }
}
