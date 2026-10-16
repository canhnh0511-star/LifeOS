package app.lifeos.measure.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "metrics")
public class Metric {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false, updatable = false) private UUID userId;
    @Column(nullable = false) private String name;
    @Column(nullable = false) private String unit;
    @Column(nullable = false, updatable = false) private boolean builtin;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    protected Metric() {}

    public Metric(UUID userId, String name, String unit, boolean builtin, Instant createdAt) {
        this.id = UUID.randomUUID(); this.userId = userId; this.name = name; this.unit = unit; this.builtin = builtin; this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getName() { return name; }
    public String getUnit() { return unit; }
    public boolean isBuiltin() { return builtin; }
}
