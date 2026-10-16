package app.lifeos.identity.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
    @Id private UUID id;
    @Column(nullable = false, unique = true) private String email;
    @Column(name = "display_name", nullable = false) private String displayName;
    @Column(nullable = false) private String timezone;
    @Column(name = "password_hash", nullable = false) private String passwordHash;
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false) private Instant createdAt;

    protected User() {}

    public User(UUID id, String email, String displayName, String timezone, String passwordHash) {
        this.id = id; this.email = email; this.displayName = displayName; this.timezone = timezone; this.passwordHash = passwordHash;
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public String getTimezone() { return timezone; }
    public Instant getCreatedAt() { return createdAt; }
    public String getPasswordHash() { return passwordHash; }
}
