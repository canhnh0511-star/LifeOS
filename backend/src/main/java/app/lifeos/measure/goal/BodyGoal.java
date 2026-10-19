package app.lifeos.measure.goal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "body_goals")
class BodyGoal {
    @Id @Column(name = "user_id") private UUID userId;
    @Column(name = "height_cm", nullable = false) private int heightCm;
    @Column(name = "start_weight_kg", nullable = false) private BigDecimal startWeightKg;
    @Column(name = "target_weight_kg", nullable = false) private BigDecimal targetWeightKg;
    @Column(name = "start_date", nullable = false) private LocalDate startDate;
    @Column(nullable = false) private int days;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    protected BodyGoal() {}

    BodyGoal(UUID userId, Instant now) { this.userId = userId; this.createdAt = now; this.updatedAt = now; }

    void set(int heightCm, BigDecimal start, BigDecimal target, LocalDate startDate, int days, Instant now) {
        this.heightCm = heightCm; this.startWeightKg = start; this.targetWeightKg = target; this.startDate = startDate; this.days = days; this.updatedAt = now;
    }

    int heightCm() { return heightCm; }
    BigDecimal startWeightKg() { return startWeightKg; }
    BigDecimal targetWeightKg() { return targetWeightKg; }
    LocalDate startDate() { return startDate; }
    int days() { return days; }
}
