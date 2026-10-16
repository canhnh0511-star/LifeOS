package app.lifeos.ledger.repository;

import app.lifeos.ledger.model.XpTransaction;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface XpTransactionRepository extends JpaRepository<XpTransaction, UUID> {
    /** Rows of (category name, summed amount). */
    @Query("select x.category, sum(x.amount) from XpTransaction x where x.userId = :userId group by x.category")
    List<Object[]> sumByCategory(@Param("userId") UUID userId);

    @Query("select coalesce(sum(x.amount), 0) from XpTransaction x where x.userId = :userId and x.scheduledDate = :date")
    long sumForDate(@Param("userId") UUID userId, @Param("date") LocalDate date);

    /** Rows of (scheduled date, summed amount) for days in [from, to]. */
    @Query("select x.scheduledDate, sum(x.amount) from XpTransaction x where x.userId = :userId and x.scheduledDate between :from and :to group by x.scheduledDate")
    List<Object[]> sumByDate(@Param("userId") UUID userId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("select x.amount from XpTransaction x where x.sourceId = :questId and x.cycle = :cycle and x.eventType = app.lifeos.ledger.model.XpTransaction.EventType.QUEST_COMPLETE")
    Optional<Integer> completeAmount(@Param("questId") UUID questId, @Param("cycle") int cycle);

    List<XpTransaction> findBySourceIdAndCycleAndEventType(UUID sourceId, int cycle, XpTransaction.EventType eventType);

    @Query("select x.amount from XpTransaction x where x.sourceId = :bossStateId and x.cycle = :cycle and x.eventType = app.lifeos.ledger.model.XpTransaction.EventType.BOSS_COMPLETE")
    Optional<Integer> bossCompleteAmount(@Param("bossStateId") UUID bossStateId, @Param("cycle") int cycle);

    /** Events of one category for a source, used to read a daily chest's state (granted = grants > revokes) and next cycle. */
    @Query("select count(x) from XpTransaction x where x.sourceId = :sourceId and x.eventType = :eventType and x.category = :category")
    long countEvents(@Param("sourceId") UUID sourceId, @Param("eventType") XpTransaction.EventType eventType, @Param("category") app.lifeos.goal.model.Category category);
}
