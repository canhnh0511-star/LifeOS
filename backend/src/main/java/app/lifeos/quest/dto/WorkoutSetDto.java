package app.lifeos.quest.dto;

import java.time.LocalDate;
import java.util.List;

/** Mirrors the contract's `WorkoutSet`: one set that was done. `weightKg` is null for body weight or when not noted. */
public record WorkoutSetDto(String exercise, int setNo, int reps, Double weightKg) {
    /** The sets of one exercise on its latest earlier day; `date` is null and `sets` empty when it was never logged. */
    public record Last(LocalDate date, List<WorkoutSetDto> sets) {}
}
