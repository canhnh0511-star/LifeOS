package app.lifeos.quest.repository;

import app.lifeos.quest.model.QuestObjective;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuestObjectiveRepository extends JpaRepository<QuestObjective, UUID> {
    List<QuestObjective> findByQuestIdInOrderByQuestIdAscPositionAsc(Collection<UUID> questIds);

    /** Copies the habit's current checklist into a freshly created quest (progress 0). */
    @Modifying
    @Query(value = """
        INSERT INTO quest_objectives (id, quest_id, position, title, target, unit, step, value)
        SELECT gen_random_uuid(), :questId, position, title, target, unit, step, 0 FROM habit_objectives WHERE habit_id = :habitId
        """, nativeQuery = true)
    int snapshot(@Param("questId") UUID questId, @Param("habitId") UUID habitId);
}
