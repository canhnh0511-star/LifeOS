package app.lifeos.measure.service;

import app.lifeos.common.error.ApiException;
import app.lifeos.common.error.FieldErrors;
import app.lifeos.common.time.UserClock;
import app.lifeos.identity.repository.UserRepository;
import app.lifeos.measure.dto.MetricDto;
import app.lifeos.measure.model.Measurement;
import app.lifeos.measure.model.Metric;
import app.lifeos.measure.repository.MeasurementRepository;
import app.lifeos.measure.repository.MetricRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Body measurements (ADR-035): metrics (defaults weight, waist, body fat, plus the user's own) with one value per day.
 * Recording is idempotent by (metric, date) and never touches XP, the ledger or any streak.
 */
@Service
public class MeasurementService {
    private static final Logger log = LoggerFactory.getLogger(MeasurementService.class);
    static final int MAX_METRICS = 20;
    static final int MAX_BACKDATE_DAYS = 366;
    /** How much history `list` returns (two years: enough for any chart, bounded for a long-lived account). */
    static final int LIST_DAYS = 730;
    static final BigDecimal MAX_VALUE = new BigDecimal("100000");
    static final List<String[]> DEFAULTS = List.of(new String[] {"Cân nặng", "kg"}, new String[] {"Vòng eo", "cm"}, new String[] {"Mỡ cơ thể", "%"});

    private final MetricRepository metrics;
    private final MeasurementRepository entries;
    private final UserRepository users;
    private final UserClock clock;
    private final EntityManager em;

    public MeasurementService(MetricRepository metrics, MeasurementRepository entries, UserRepository users, UserClock clock, EntityManager em) {
        this.metrics = metrics; this.entries = entries; this.users = users; this.clock = clock; this.em = em;
    }

    private void lock(UUID userId) {
        em.createNativeQuery("select pg_advisory_xact_lock(hashtext(:k))").setParameter("k", "metrics:" + userId).getSingleResult();
    }

    /** Creates the three default metrics the first time a user touches metrics at all. Call with the user lock held. */
    private void ensureDefaults(UUID userId) {
        if (metrics.countByUserId(userId) == 0) {
            for (String[] d : DEFAULTS) metrics.save(new Metric(userId, d[0], d[1], true, clock.now()));
            metrics.flush();
        }
    }

    @Transactional
    public List<MetricDto> list(UUID userId) {
        lock(userId);
        ensureDefaults(userId);
        List<Metric> all = metrics.findByUserIdOrderByCreatedAtAscNameAsc(userId);
        Map<UUID, List<MetricDto.Entry>> byMetric = new HashMap<>();
        for (Measurement m : entries.findByUserIdAndEntryDateGreaterThanEqualOrderByEntryDateAsc(userId, clock.today(users.findById(userId).orElseThrow().getTimezone()).minusDays(LIST_DAYS))) {
            byMetric.computeIfAbsent(m.getMetricId(), k -> new java.util.ArrayList<>()).add(new MetricDto.Entry(m.getEntryDate(), m.getValue().doubleValue()));
        }
        return all.stream().map(m -> new MetricDto(m.getId(), m.getName(), m.getUnit(), m.isBuiltin(), byMetric.getOrDefault(m.getId(), List.of()))).toList();
    }

    @Transactional
    public MetricDto create(UUID userId, String name, String unit) {
        FieldErrors errors = new FieldErrors();
        String n = name == null ? "" : name.trim();
        String u = unit == null ? "" : unit.trim();
        if (n.isEmpty() || n.length() > 40) errors.add("name", "Tên chỉ số từ 1 đến 40 ký tự.");
        if (u.length() > 12) errors.add("unit", "Đơn vị tối đa 12 ký tự.");
        errors.throwIfAny();
        lock(userId);
        ensureDefaults(userId); // a custom metric created first must not stop the defaults from ever appearing
        if (metrics.countByUserId(userId) >= MAX_METRICS) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "TOO_MANY_METRICS", "Tối đa " + MAX_METRICS + " chỉ số.");
        if (metrics.nameTaken(userId, n)) { new FieldErrors().add("name", "Đã có chỉ số tên này.").throwIfAny(); }
        Metric saved = metrics.save(new Metric(userId, n, u, false, clock.now()));
        log.info("metric.created userId={} metricId={}", userId, saved.getId());
        return view(saved);
    }

    @Transactional
    public MetricDto record(UUID userId, String metricId, String dateText, Object value) {
        lock(userId); // lock first, then look: a concurrent delete of the metric must be seen here as 404, not as a foreign-key error
        Metric metric = find(userId, metricId);
        LocalDate date = parseDate(userId, dateText, true);
        BigDecimal v = parseValue(value);
        Measurement existing = entries.findByMetricIdAndEntryDate(metric.getId(), date).orElse(null);
        if (existing == null) entries.save(new Measurement(metric.getId(), userId, date, v, clock.now()));
        else existing.setValue(v, clock.now());
        entries.flush();
        log.info("measurement.recorded userId={} metricId={} date={}", userId, metric.getId(), date);
        return view(metric);
    }

    @Transactional
    public MetricDto remove(UUID userId, String metricId, String dateText) {
        lock(userId);
        Metric metric = find(userId, metricId);
        LocalDate date = parseDate(userId, dateText, false); // a value that aged past the recording window can still be deleted
        entries.findByMetricIdAndEntryDate(metric.getId(), date).ifPresent(entries::delete);
        entries.flush();
        return view(metric);
    }

    @Transactional
    public void delete(UUID userId, String metricId) {
        lock(userId);
        Metric metric = find(userId, metricId);
        if (metric.isBuiltin()) throw new ApiException(HttpStatus.CONFLICT, "METRIC_BUILTIN", "Không xoá được chỉ số mặc định.");
        entries.deleteByMetricId(metric.getId());
        metrics.delete(metric);
        metrics.flush();
    }

    private MetricDto view(Metric m) {
        LocalDate from = clock.today(users.findById(m.getUserId()).orElseThrow().getTimezone()).minusDays(LIST_DAYS); // same window as list()
        List<MetricDto.Entry> list = entries.findByMetricIdOrderByEntryDateAsc(m.getId()).stream().filter(e -> !e.getEntryDate().isBefore(from)).map(e -> new MetricDto.Entry(e.getEntryDate(), e.getValue().doubleValue())).toList();
        return new MetricDto(m.getId(), m.getName(), m.getUnit(), m.isBuiltin(), list);
    }

    private Metric find(UUID userId, String id) {
        try { return metrics.findByIdAndUserId(UUID.fromString(id), userId).orElseThrow(() -> FieldErrors.notFound("chỉ số")); }
        catch (IllegalArgumentException e) { throw FieldErrors.notFound("chỉ số"); }
    }

    private LocalDate parseDate(UUID userId, String text, boolean limitBackdate) {
        LocalDate date;
        try { date = LocalDate.parse(text); }
        catch (DateTimeException e) { new FieldErrors().add("date", "Ngày phải có dạng YYYY-MM-DD.").throwIfAny(); return null; }
        LocalDate today = clock.today(users.findById(userId).orElseThrow().getTimezone());
        if (date.isAfter(today)) new FieldErrors().add("date", "Không thể ghi số đo cho ngày trong tương lai.").throwIfAny();
        if (limitBackdate && ChronoUnit.DAYS.between(date, today) > MAX_BACKDATE_DAYS) new FieldErrors().add("date", "Chỉ ghi được số đo trong " + MAX_BACKDATE_DAYS + " ngày gần nhất.").throwIfAny();
        return date;
    }

    /** `value` arrives as an Object so "x" is a field error (422) instead of unreadable JSON; two decimals, greater than 0. */
    private static BigDecimal parseValue(Object value) {
        if (!(value instanceof Number n) || !Double.isFinite(n.doubleValue())) { new FieldErrors().add("value", "Giá trị phải là một số.").throwIfAny(); return null; }
        BigDecimal v = new BigDecimal(n.toString()).setScale(2, RoundingMode.HALF_UP);
        if (v.signum() <= 0 || v.compareTo(MAX_VALUE) > 0) new FieldErrors().add("value", "Giá trị phải lớn hơn 0 và không quá 100000.").throwIfAny();
        return v;
    }
}
