package app.lifeos.journey.repository;

import app.lifeos.journey.model.Journey;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JourneyRepository extends JpaRepository<Journey, UUID> {
    Optional<Journey> findByUserId(UUID userId);

    /** Two concurrent first reads create one journey (user_id is unique). */
    @Modifying
    @Query(value = "INSERT INTO journeys (id, user_id, title, start_date, duration_days, created_at) VALUES (:id, :userId, :title, :start, :days, :now) ON CONFLICT (user_id) DO NOTHING", nativeQuery = true)
    int createIfAbsent(@Param("id") UUID id, @Param("userId") UUID userId, @Param("title") String title, @Param("start") LocalDate start, @Param("days") int days, @Param("now") Instant now);
}
