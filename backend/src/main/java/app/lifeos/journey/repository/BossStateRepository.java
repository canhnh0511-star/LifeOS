package app.lifeos.journey.repository;

import app.lifeos.journey.model.BossState;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BossStateRepository extends JpaRepository<BossState, UUID> {
    List<BossState> findByUserId(UUID userId);

    /** Row lock: concurrent defeats/undos of the same boss serialize here, so the transition and ledger write happen once. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<BossState> findByJourneyIdAndBossCode(UUID journeyId, String bossCode);

    @Modifying
    @Query(value = """
        INSERT INTO boss_states (id, user_id, journey_id, boss_code, status, cycle, created_at)
        VALUES (:id, :userId, :journeyId, :code, 'AVAILABLE', 0, :now)
        ON CONFLICT (journey_id, boss_code) DO NOTHING
        """, nativeQuery = true)
    int ensure(@Param("id") UUID id, @Param("userId") UUID userId, @Param("journeyId") UUID journeyId, @Param("code") String code, @Param("now") Instant now);
}
