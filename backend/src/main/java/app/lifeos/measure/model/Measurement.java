package app.lifeos.measure.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "measurements")
public class Measurement {
    @Id private UUID id;
    @Column(name = "metric_id", nullable = false, updatable = false) private UUID metricId;
    @Column(name = "user_id", nullable = false, updatable = false) private UUID userId;
    @Column(name = "entry_date", nullable = false, updatable = false) private LocalDate entryDate;
    @Column(nullable = false) private BigDecimal value;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    protected Measurement() {}

    public Measurement(UUID metricId, UUID userId, LocalDate entryDate, BigDecimal value, Instant now) {
        this.id = UUID.randomUUID(); this.metricId = metricId; this.userId = userId; this.entryDate = entryDate; this.value = value; this.createdAt = now; this.updatedAt = now;
    }

    public UUID getMetricId() { return metricId; }
    public LocalDate getEntryDate() { return entryDate; }
    public BigDecimal getValue() { return value; }
    public void setValue(BigDecimal value, Instant now) { this.value = value; this.updatedAt = now; }
}
