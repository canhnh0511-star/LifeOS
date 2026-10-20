package app.lifeos.measure.goal;

import app.lifeos.common.error.FieldErrors;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BodyGoalService {
    record Goal(int heightCm, double startWeightKg, double targetWeightKg, String startDate, int days) {}

    /** What the training plan needs from the body goal: who the plan is for and which way the weight should go. */
    public record Basis(int heightCm, double startWeightKg, double targetWeightKg) {}

    private final BodyGoalRepository goals;

    BodyGoalService(BodyGoalRepository goals) { this.goals = goals; }

    @Transactional(readOnly = true)
    public Optional<Basis> basis(UUID userId) { return goals.findById(userId).map(g -> new Basis(g.heightCm(), g.startWeightKg().doubleValue(), g.targetWeightKg().doubleValue())); }

    @Transactional(readOnly = true)
    Goal get(UUID userId) { return goals.findById(userId).map(BodyGoalService::dto).orElseThrow(() -> FieldErrors.notFound("mục tiêu cơ thể")); }

    /** Sets the account's one body goal, replacing the previous one. Values stay Objects so a wrong type is a field error, not an unreadable body. */
    @Transactional
    Goal save(UUID userId, Object height, Object start, Object target, Object startDate, Object days) {
        FieldErrors errors = new FieldErrors();
        if (!(height instanceof Integer h) || h < 100 || h > 250) errors.add("heightCm", "Chiều cao từ 100 đến 250 cm.");
        BigDecimal s = weight(start, "startWeightKg", "Cân nặng bắt đầu", errors), t = weight(target, "targetWeightKg", "Cân nặng mục tiêu", errors);
        if (s != null && t != null && s.compareTo(t) == 0) errors.add("targetWeightKg", "Cân nặng mục tiêu phải khác cân nặng bắt đầu.");
        LocalDate date = null;
        try { if (startDate instanceof String d) date = LocalDate.parse(d); else errors.add("startDate", "Ngày bắt đầu có dạng YYYY-MM-DD."); }
        catch (DateTimeParseException e) { errors.add("startDate", "Ngày bắt đầu có dạng YYYY-MM-DD."); }
        if (!(days instanceof Integer n) || n < 14 || n > 366) errors.add("days", "Số ngày từ 14 đến 366.");
        errors.throwIfAny();
        Instant now = Instant.now();
        BodyGoal goal = goals.findById(userId).orElseGet(() -> new BodyGoal(userId, now));
        goal.set((Integer) height, s, t, date, (Integer) days, now);
        goals.save(goal);
        return dto(goal);
    }

    private static BigDecimal weight(Object v, String field, String label, FieldErrors errors) {
        if (!(v instanceof Number n) || n.doubleValue() < 20 || n.doubleValue() > 300) { errors.add(field, label + " từ 20 đến 300 kg."); return null; }
        return BigDecimal.valueOf(n.doubleValue()).setScale(1, RoundingMode.HALF_UP);
    }

    private static Goal dto(BodyGoal g) { return new Goal(g.heightCm(), g.startWeightKg().doubleValue(), g.targetWeightKg().doubleValue(), g.startDate().toString(), g.days()); }
}
