package app.lifeos.quest.service;

import app.lifeos.common.time.UserClock;
import app.lifeos.habit.model.Habit;
import app.lifeos.quest.repository.QuestInstanceRepository;
import app.lifeos.quest.repository.QuestObjectiveRepository;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * The one place a quest row is created. The reward, category and checklist are copied in the same transaction as the insert, so the
 * request that wins a concurrent creation also writes the snapshot, and the one that loses sees it complete once the insert unblocks.
 */
@Component
public class QuestMaterializer {
    private final QuestInstanceRepository instances;
    private final QuestObjectiveRepository objectives;
    private final UserClock clock;

    public QuestMaterializer(QuestInstanceRepository instances, QuestObjectiveRepository objectives, UserClock clock) {
        this.instances = instances; this.objectives = objectives; this.clock = clock;
    }

    /** @return true if this call created the quest */
    public boolean ensure(UUID userId, Habit habit, String category, LocalDate day) {
        UUID id = UUID.randomUUID();
        if (instances.materialize(id, userId, habit.getId(), day, category, habit.getXpReward(), clock.now()) == 0) return false;
        objectives.snapshot(id, habit.getId());
        return true;
    }
}
