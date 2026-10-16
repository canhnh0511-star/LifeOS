package app.lifeos.habit.repository;

import app.lifeos.habit.model.HabitObjective;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HabitObjectiveRepository extends JpaRepository<HabitObjective, UUID> {
    List<HabitObjective> findByHabitIdInOrderByHabitIdAscPositionAsc(Collection<UUID> habitIds);

    void deleteByHabitId(UUID habitId);
}
