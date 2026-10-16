package app.lifeos.lifecycle.model;

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
@Table(name = "lifecycle_events")
public class LifecycleEvent {
    public enum Subject { GOAL, HABIT }

    @Id private UUID id;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Enumerated(EnumType.STRING) @Column(name = "subject_type", nullable = false) private Subject subjectType;
    @Column(name = "subject_id", nullable = false) private UUID subjectId;
    @Column(name = "effective_date", nullable = false) private LocalDate effectiveDate;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private RecordStatus status;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    protected LifecycleEvent() {}

    public LifecycleEvent(UUID userId, Subject subjectType, UUID subjectId, LocalDate effectiveDate, RecordStatus status, Instant createdAt) {
        this.id = UUID.randomUUID(); this.userId = userId; this.subjectType = subjectType; this.subjectId = subjectId;
        this.effectiveDate = effectiveDate; this.status = status; this.createdAt = createdAt;
    }

    public LocalDate getEffectiveDate() { return effectiveDate; }
    public RecordStatus getStatus() { return status; }
}
