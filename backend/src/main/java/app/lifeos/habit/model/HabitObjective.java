package app.lifeos.habit.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/** One line of a habit's checklist. Immutable: an edit replaces the whole list. */
@Entity
@Table(name = "habit_objectives")
public class HabitObjective {
    @Id private UUID id;
    @Column(name = "habit_id", nullable = false, updatable = false) private UUID habitId;
    @Column(nullable = false, updatable = false) private int position;
    @Column(nullable = false, updatable = false) private String title;
    @Column(nullable = false, updatable = false) private int target;
    @Column(nullable = false, updatable = false) private String unit;
    @Column(nullable = false, updatable = false) private int step;

    protected HabitObjective() {}

    public HabitObjective(UUID habitId, int position, String title, int target, String unit, int step) {
        this.id = UUID.randomUUID(); this.habitId = habitId; this.position = position; this.title = title; this.target = target; this.unit = unit; this.step = step;
    }

    public UUID getId() { return id; }
    public UUID getHabitId() { return habitId; }
    public int getPosition() { return position; }
    public String getTitle() { return title; }
    public int getTarget() { return target; }
    public String getUnit() { return unit; }
    public int getStep() { return step; }
}
