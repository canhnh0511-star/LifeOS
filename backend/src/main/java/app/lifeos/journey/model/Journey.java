package app.lifeos.journey.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "journeys")
public class Journey {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false, updatable = false) private UUID userId;
    @Column(nullable = false, updatable = false) private String title;
    @Column(name = "start_date", nullable = false, updatable = false) private LocalDate startDate;
    @Column(name = "duration_days", nullable = false, updatable = false) private int durationDays;

    protected Journey() {}

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public LocalDate getStartDate() { return startDate; }
    public int getDurationDays() { return durationDays; }
    public LocalDate finalDate() { return startDate.plusDays(durationDays - 1L); }
}
