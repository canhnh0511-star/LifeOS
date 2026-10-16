package app.lifeos.goal.repository;

import app.lifeos.goal.model.Goal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoalRepository extends JpaRepository<Goal, UUID> {
    List<Goal> findByUserIdOrderByCreatedAtAsc(UUID userId);
    /** Ownership is part of every lookup: another user's id behaves exactly like a missing one. */
    Optional<Goal> findByIdAndUserId(UUID id, UUID userId);
}
