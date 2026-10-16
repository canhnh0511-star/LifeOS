package app.lifeos.journey.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Whether a boss is currently defeated, and which defeat (cycle) the ledger events belong to. */
@Entity
@Table(name = "boss_states")
public class BossState {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false, updatable = false) private UUID userId;
    @Column(name = "journey_id", nullable = false, updatable = false) private UUID journeyId;
    @Column(name = "boss_code", nullable = false, updatable = false) private String bossCode;
    @Column(nullable = false) private String status;
    @Column(nullable = false) private int cycle;
    @Column(name = "defeated_date") private LocalDate defeatedDate;
    @Column(name = "defeated_at") private Instant defeatedAt;

    protected BossState() {}

    public UUID getId() { return id; }
    public String getBossCode() { return bossCode; }
    public int getCycle() { return cycle; }
    public LocalDate getDefeatedDate() { return defeatedDate; }
    public Instant getDefeatedAt() { return defeatedAt; }
    public boolean isDefeated() { return "DEFEATED".equals(status); }

    /** AVAILABLE -> DEFEATED starts a new cycle. */
    public void defeat(LocalDate date, Instant at) { status = "DEFEATED"; cycle++; defeatedDate = date; defeatedAt = at; }
    public void revert() { status = "AVAILABLE"; defeatedDate = null; defeatedAt = null; }
}
