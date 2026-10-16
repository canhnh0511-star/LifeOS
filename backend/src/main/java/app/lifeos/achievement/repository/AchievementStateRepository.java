package app.lifeos.achievement.repository;

import app.lifeos.achievement.model.AchievementState;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AchievementStateRepository extends JpaRepository<AchievementState, UUID> {
    List<AchievementState> findByJourneyId(UUID journeyId);

    /** Row locks in a fixed (code) order: concurrent mutations of one user evaluate achievements one at a time, without deadlocking. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<AchievementState> findByJourneyIdOrderByCode(UUID journeyId);

    @Modifying
    @Query(value = """
        INSERT INTO achievement_states (id, user_id, journey_id, code, status, cycle, created_at)
        VALUES (:id, :userId, :journeyId, :code, 'LOCKED', 0, :now)
        ON CONFLICT (journey_id, code) DO NOTHING
        """, nativeQuery = true)
    int ensure(@Param("id") UUID id, @Param("userId") UUID userId, @Param("journeyId") UUID journeyId, @Param("code") String code, @Param("now") Instant now);
}
