package app.lifeos.measure.controller;

import app.lifeos.measure.dto.MetricDto;
import app.lifeos.measure.service.MeasurementService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/metrics")
class MetricController {
    private final MeasurementService service;

    MetricController(MeasurementService service) { this.service = service; }

    record CreateMetricRequest(String name, String unit) {}
    /** `value` stays an Object so a non-number is a field error (422) rather than an unreadable body. */
    record EntryRequest(Object value) {}

    @GetMapping
    List<MetricDto> list(Authentication auth) { return service.list(UUID.fromString(auth.getName())); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    MetricDto create(Authentication auth, @RequestBody CreateMetricRequest body) { return service.create(UUID.fromString(auth.getName()), body.name(), body.unit()); }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(Authentication auth, @PathVariable String id) { service.delete(UUID.fromString(auth.getName()), id); }

    @PutMapping("/{id}/entries/{date}")
    MetricDto record(Authentication auth, @PathVariable String id, @PathVariable String date, @RequestBody EntryRequest body) { return service.record(UUID.fromString(auth.getName()), id, date, body.value()); }

    @DeleteMapping("/{id}/entries/{date}")
    MetricDto remove(Authentication auth, @PathVariable String id, @PathVariable String date) { return service.remove(UUID.fromString(auth.getName()), id, date); }
}
