package app.lifeos.achievement.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "achievement_states")
public class AchievementState {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false, updatable = false) private UUID userId;
    @Column(name = "journey_id", nullable = false, updatable = false) private UUID journeyId;
    @Column(nullable = false, updatable = false) private String code;
    @Column(nullable = false) private String status;
    @Column(nullable = false) private int cycle;
    @Column(name = "earned_date") private LocalDate earnedDate;
    @Column(name = "earned_at") private Instant earnedAt;

    protected AchievementState() {}

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public int getCycle() { return cycle; }
    public boolean isEarned() { return "EARNED".equals(status); }
    public LocalDate getEarnedDate() { return earnedDate; }
    public Instant getEarnedAt() { return earnedAt; }

    /** LOCKED -> EARNED starts a new cycle. */
    public void grant(LocalDate date, Instant at) { status = "EARNED"; cycle++; earnedDate = date; earnedAt = at; }
    public void revoke() { status = "LOCKED"; earnedDate = null; earnedAt = null; }
}
