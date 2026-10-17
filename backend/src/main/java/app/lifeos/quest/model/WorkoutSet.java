package app.lifeos.quest.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "workout_sets")
public class WorkoutSet {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false, updatable = false) private UUID userId;
    @Column(name = "habit_id", nullable = false, updatable = false) private UUID habitId;
    @Column(name = "entry_date", nullable = false, updatable = false) private LocalDate entryDate;
    @Column(nullable = false, updatable = false) private String exercise;
    @Column(name = "set_no", nullable = false, updatable = false) private int setNo;
    @Column(nullable = false) private int reps;
    @Column(name = "weight_kg") private BigDecimal weightKg;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    protected WorkoutSet() {}

    public WorkoutSet(UUID userId, UUID habitId, LocalDate entryDate, String exercise, int setNo, int reps, BigDecimal weightKg, Instant now) {
        this.id = UUID.randomUUID(); this.userId = userId; this.habitId = habitId; this.entryDate = entryDate; this.exercise = exercise; this.setNo = setNo;
        this.reps = reps; this.weightKg = weightKg; this.createdAt = now; this.updatedAt = now;
    }

    public LocalDate getEntryDate() { return entryDate; }
    public String getExercise() { return exercise; }
    public int getSetNo() { return setNo; }
    public int getReps() { return reps; }
    public BigDecimal getWeightKg() { return weightKg; }
    public void change(int reps, BigDecimal weightKg, Instant now) { this.reps = reps; this.weightKg = weightKg; this.updatedAt = now; }
}
