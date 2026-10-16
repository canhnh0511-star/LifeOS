package app.lifeos.quest.repository;

import app.lifeos.quest.model.QuestInstance;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuestInstanceRepository extends JpaRepository<QuestInstance, UUID> {
    List<QuestInstance> findByUserIdAndScheduledDate(UUID userId, LocalDate scheduledDate);

    /** Idempotent under concurrency: the unique (user, habit, date) key makes a racing insert a no-op. */
    @Modifying
    @Query(value = """
        INSERT INTO quest_instances (id, user_id, habit_id, scheduled_date, category, xp_reward, status, created_at)
        VALUES (:id, :userId, :habitId, :date, :category, :xpReward, 'PENDING', :now)
        ON CONFLICT (user_id, habit_id, scheduled_date) DO NOTHING
        """, nativeQuery = true)
    int materialize(@Param("id") UUID id, @Param("userId") UUID userId, @Param("habitId") UUID habitId, @Param("date") LocalDate date,
                    @Param("category") String category, @Param("xpReward") int xpReward, @Param("now") Instant now);
}
