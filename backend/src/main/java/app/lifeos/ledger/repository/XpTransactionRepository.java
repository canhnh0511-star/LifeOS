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

    @Query("select x.amount from XpTransaction x where x.sourceId = :questId and x.cycle = :cycle and x.eventType = app.lifeos.ledger.model.XpTransaction.EventType.QUEST_COMPLETE")
    Optional<Integer> completeAmount(@Param("questId") UUID questId, @Param("cycle") int cycle);
}
