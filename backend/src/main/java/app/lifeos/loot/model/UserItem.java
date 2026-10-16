package app.lifeos.loot.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_items")
public class UserItem {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false, updatable = false) private UUID userId;
    @Column(name = "item_code", nullable = false, updatable = false) private String itemCode;
    @Column(nullable = false, updatable = false) private String slot;
    @Column(name = "source_key", nullable = false, updatable = false) private String sourceKey;
    @Column(nullable = false) private boolean equipped;
    @Column(name = "acquired_at", nullable = false, updatable = false) private Instant acquiredAt;

    protected UserItem() {}

    public UserItem(UUID userId, String itemCode, String slot, String sourceKey, Instant acquiredAt) {
        this.id = UUID.randomUUID(); this.userId = userId; this.itemCode = itemCode; this.slot = slot; this.sourceKey = sourceKey; this.acquiredAt = acquiredAt;
    }

    public String getItemCode() { return itemCode; }
    public String getSlot() { return slot; }
    public String getSourceKey() { return sourceKey; }
    public boolean isEquipped() { return equipped; }
    public Instant getAcquiredAt() { return acquiredAt; }
    public void setEquipped(boolean equipped) { this.equipped = equipped; }
}
