package app.lifeos.measure.goal;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface BodyGoalRepository extends JpaRepository<BodyGoal, UUID> {}
