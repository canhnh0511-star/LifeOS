package app.lifeos.quest.model;

import app.lifeos.goal.model.Category;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** A scheduled session that has been materialized for a lived day. Reward and category are snapshots. */
@Entity
@Table(name = "quest_instances")
public class QuestInstance {
    public enum Status { PENDING, COMPLETED }

    @Id private UUID id;
    @Column(name = "user_id", nullable = false, updatable = false) private UUID userId;
    @Column(name = "habit_id", nullable = false, updatable = false) private UUID habitId;
    @Column(name = "scheduled_date", nullable = false, updatable = false) private LocalDate scheduledDate;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false) private Category category;
    @Column(name = "xp_reward", nullable = false, updatable = false) private int xpReward;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Status status;
    @Column(name = "completed_at") private Instant completedAt;
    @Column(nullable = false) private int cycle;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    protected QuestInstance() {}

    public UUID getId() { return id; }
    public int getCycle() { return cycle; }

    /** PENDING -> COMPLETED starts a new cycle. */
    public void complete(Instant at) { status = Status.COMPLETED; cycle++; completedAt = at; }
    public void revert() { status = Status.PENDING; completedAt = null; }

    public UUID getHabitId() { return habitId; }
    public LocalDate getScheduledDate() { return scheduledDate; }
    public Category getCategory() { return category; }
    public int getXpReward() { return xpReward; }
    public Status getStatus() { return status; }
    public Instant getCompletedAt() { return completedAt; }
}
