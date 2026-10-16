package app.lifeos.habit.repository;

import app.lifeos.habit.model.HabitScheduleVersion;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HabitScheduleVersionRepository extends JpaRepository<HabitScheduleVersion, UUID> {
    List<HabitScheduleVersion> findByHabitIdInOrderByEffectiveFromAsc(Collection<UUID> habitIds);
}
