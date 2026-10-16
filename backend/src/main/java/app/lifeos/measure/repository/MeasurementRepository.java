package app.lifeos.measure.repository;

import app.lifeos.measure.model.Measurement;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeasurementRepository extends JpaRepository<Measurement, UUID> {
    List<Measurement> findByUserIdAndEntryDateGreaterThanEqualOrderByEntryDateAsc(UUID userId, LocalDate from);
    List<Measurement> findByMetricIdOrderByEntryDateAsc(UUID metricId);
    Optional<Measurement> findByMetricIdAndEntryDate(UUID metricId, LocalDate date);
    void deleteByMetricId(UUID metricId);
}
