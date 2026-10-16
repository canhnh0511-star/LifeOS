package app.lifeos.habit.model;

import app.lifeos.lifecycle.model.RecordStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "habits")
public class Habit {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false, updatable = false) private UUID userId;
    @Column(name = "goal_id", nullable = false, updatable = false) private UUID goalId;
    @Column(nullable = false) private String title;
    @Column(name = "target_minutes", nullable = false) private int targetMinutes;
    @Column(name = "xp_reward", nullable = false) private int xpReward;
    @Column(name = "start_date", nullable = false, updatable = false) private LocalDate startDate;
    @Column(name = "end_date") private LocalDate endDate;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private RecordStatus status;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    protected Habit() {}

    public Habit(UUID userId, UUID goalId, String title, int targetMinutes, int xpReward, LocalDate startDate, Instant createdAt) {
        this.id = UUID.randomUUID(); this.userId = userId; this.goalId = goalId; this.title = title;
        this.targetMinutes = targetMinutes; this.xpReward = xpReward; this.startDate = startDate;
        this.status = RecordStatus.ACTIVE; this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getGoalId() { return goalId; }
    public String getTitle() { return title; }
    public int getTargetMinutes() { return targetMinutes; }
    public int getXpReward() { return xpReward; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public RecordStatus getStatus() { return status; }
    public void setStatus(RecordStatus status) { this.status = status; }
    public void setTitle(String title) { this.title = title; }
    public void setTargetMinutes(int targetMinutes) { this.targetMinutes = targetMinutes; }
    /** Only affects quests not yet materialized; materialized quests keep the reward they were created with. */
    public void setXpReward(int xpReward) { this.xpReward = xpReward; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
}
