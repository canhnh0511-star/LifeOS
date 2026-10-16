package app.lifeos.measure.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Mirrors the contract's `Metric`: the metric and its recorded values, oldest first. */
public record MetricDto(UUID id, String name, String unit, boolean builtin, List<Entry> entries) {
    public record Entry(LocalDate date, double value) {}
}
