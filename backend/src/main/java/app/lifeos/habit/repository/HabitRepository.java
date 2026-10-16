package app.lifeos.habit.repository;

import app.lifeos.habit.model.Habit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HabitRepository extends JpaRepository<Habit, UUID> {
    List<Habit> findByUserIdOrderByCreatedAtAsc(UUID userId);
    Optional<Habit> findByIdAndUserId(UUID id, UUID userId);
}
