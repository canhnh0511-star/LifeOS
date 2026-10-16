package app.lifeos.habit.repository;

import app.lifeos.habit.model.Habit;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HabitRepository extends JpaRepository<Habit, UUID> {
    List<Habit> findByUserIdOrderByCreatedAtAsc(UUID userId);
    Optional<Habit> findByIdAndUserId(UUID id, UUID userId);

    /** Row lock for edits: concurrent PATCHes of one habit run one after the other. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select h from Habit h where h.id = :id and h.userId = :userId")
    Optional<Habit> lockByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);
}
