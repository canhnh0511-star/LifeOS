package app.lifeos.ledger.model;

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

/** One immutable ledger event. Never updated or deleted (a database trigger enforces it). */
@Entity
@Table(name = "xp_transactions")
public class XpTransaction {
    public enum EventType { QUEST_COMPLETE, QUEST_REVERT, BOSS_COMPLETE, BOSS_REVERT }

    @Id private UUID id;
    @Column(name = "user_id", nullable = false, updatable = false) private UUID userId;
    @Column(name = "source_type", nullable = false, updatable = false) private String sourceType;
    @Column(name = "source_id", nullable = false, updatable = false) private UUID sourceId;
    @Enumerated(EnumType.STRING) @Column(name = "event_type", nullable = false, updatable = false) private EventType eventType;
    @Column(nullable = false, updatable = false) private int cycle;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false) private Category category;
    @Column(nullable = false, updatable = false) private int amount;
    @Column(name = "scheduled_date", nullable = false, updatable = false) private LocalDate scheduledDate;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    protected XpTransaction() {}

    public XpTransaction(UUID userId, UUID questId, EventType eventType, int cycle, Category category, int amount, LocalDate scheduledDate, Instant createdAt) {
        this.id = UUID.randomUUID(); this.userId = userId; this.sourceType = "QUEST"; this.sourceId = questId; this.eventType = eventType;
        this.cycle = cycle; this.category = category; this.amount = amount; this.scheduledDate = scheduledDate; this.createdAt = createdAt;
    }

    /** A boss event; `sourceId` is the boss_states row. */
    public static XpTransaction boss(UUID userId, UUID bossStateId, EventType eventType, int cycle, Category category, int amount, LocalDate date, Instant createdAt) {
        XpTransaction t = new XpTransaction(userId, bossStateId, eventType, cycle, category, amount, date, createdAt);
        t.sourceType = "BOSS";
        return t;
    }

    public int getAmount() { return amount; }
}
