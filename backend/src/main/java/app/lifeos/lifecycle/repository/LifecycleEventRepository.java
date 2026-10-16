package app.lifeos.lifecycle.repository;

import app.lifeos.lifecycle.model.LifecycleEvent;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LifecycleEventRepository extends JpaRepository<LifecycleEvent, UUID> {
    List<LifecycleEvent> findBySubjectTypeAndSubjectIdOrderByEffectiveDateAscCreatedAtAsc(LifecycleEvent.Subject type, UUID subjectId);
}
