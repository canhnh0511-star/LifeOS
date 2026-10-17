package app.lifeos.quest.repository;

import app.lifeos.quest.model.WorkoutSet;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkoutSetRepository extends JpaRepository<WorkoutSet, UUID> {
    List<WorkoutSet> findByUserIdAndHabitIdAndEntryDateOrderByExerciseAscSetNoAsc(UUID userId, UUID habitId, LocalDate date);

    long countByUserIdAndHabitIdAndEntryDate(UUID userId, UUID habitId, LocalDate date);

    @Query("select s from WorkoutSet s where s.userId = :userId and s.habitId = :habitId and s.entryDate = :date and lower(s.exercise) = lower(:exercise) and s.setNo = :setNo")
    Optional<WorkoutSet> findOne(@Param("userId") UUID userId, @Param("habitId") UUID habitId, @Param("date") LocalDate date, @Param("exercise") String exercise, @Param("setNo") int setNo);

    /** The latest day before `before` on which the user logged this exercise (any quest), or null. */
    @Query("select max(s.entryDate) from WorkoutSet s where s.userId = :userId and lower(s.exercise) = lower(:exercise) and s.entryDate < :before")
    LocalDate lastDay(@Param("userId") UUID userId, @Param("exercise") String exercise, @Param("before") LocalDate before);

    @Query("select s from WorkoutSet s where s.userId = :userId and lower(s.exercise) = lower(:exercise) and s.entryDate = :date order by s.habitId asc, s.setNo asc")
    List<WorkoutSet> onDay(@Param("userId") UUID userId, @Param("exercise") String exercise, @Param("date") LocalDate date);
}
