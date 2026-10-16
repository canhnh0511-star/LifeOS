package app.lifeos.measure.repository;

import app.lifeos.measure.model.Metric;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MetricRepository extends JpaRepository<Metric, UUID> {
    List<Metric> findByUserIdOrderByCreatedAtAscNameAsc(UUID userId);
    Optional<Metric> findByIdAndUserId(UUID id, UUID userId);
    long countByUserId(UUID userId);

    @Query("select count(m) > 0 from Metric m where m.userId = :userId and lower(m.name) = lower(:name)")
    boolean nameTaken(@Param("userId") UUID userId, @Param("name") String name);
}
