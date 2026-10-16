package app.lifeos.goal.model;

import app.lifeos.lifecycle.model.RecordStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "goals")
public class Goal {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false, updatable = false) private UUID userId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false) private Category category;
    @Column(nullable = false) private String title;
    @Column(nullable = false) private String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private RecordStatus status;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    protected Goal() {}

    public Goal(UUID userId, Category category, String title, String description, Instant createdAt) {
        this.id = UUID.randomUUID(); this.userId = userId; this.category = category; this.title = title;
        this.description = description; this.status = RecordStatus.ACTIVE; this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public Category getCategory() { return category; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public RecordStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setStatus(RecordStatus status) { this.status = status; }
}
