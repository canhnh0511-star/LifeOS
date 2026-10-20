package app.lifeos.plan;

import app.lifeos.goal.dto.GoalDto;
import app.lifeos.goal.service.GoalService;
import app.lifeos.habit.dto.HabitDto;
import app.lifeos.habit.service.HabitService;
import app.lifeos.importer.dto.ImportHabitPlanRequest;
import app.lifeos.importer.dto.ImportHabitPlanRequest.PlanGoal;
import app.lifeos.importer.dto.ImportHabitPlanRequest.PlanHabit;
import app.lifeos.importer.service.HabitPlanImportService;
import app.lifeos.lifecycle.model.RecordStatus;
import app.lifeos.measure.goal.BodyGoalService;
import app.lifeos.plan.StandardPlan.Variant;
import app.lifeos.plan.TrainingPlanDto.Line;
import app.lifeos.plan.TrainingPlanDto.Session;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Each account has at most one gym plan: an ACTIVE goal titled like {@link StandardPlan#TITLE} with its habits. Nothing is stored
 * besides those ordinary goal and habit rows, so progress, XP and edits to a session behave exactly as for any other habit.
 */
@Service
public class PlanService {
    private final GoalService goals;
    private final HabitService habits;
    private final HabitPlanImportService importer;
    private final BodyGoalService bodyGoals;

    public PlanService(GoalService goals, HabitService habits, HabitPlanImportService importer, BodyGoalService bodyGoals) {
        this.goals = goals; this.habits = habits; this.importer = importer; this.bodyGoals = bodyGoals;
    }

    /** The result of {@link #start}: `created` is false when the account already had its plan. */
    public record Started(boolean created, TrainingPlanDto plan) {}

    public TrainingPlanDto current(UUID userId) {
        Variant suggested = suggested(userId);
        return find(userId).map(g -> fromAccount(userId, g, suggested)).orElseGet(() -> template(suggested));
    }

    /** Creates the standard plan for this account unless it already has it (idempotent). Validation and limits are those of the plan import. */
    @Transactional
    public Started start(UUID userId, String startDate) {
        Optional<GoalDto> existing = find(userId);
        Variant variant = suggested(userId);
        if (existing.isPresent()) return new Started(false, fromAccount(userId, existing.get(), variant));
        List<PlanHabit> planned = new ArrayList<>();
        for (StandardPlan.Day d : StandardPlan.days(variant)) {
            List<Map<String, Object>> lines = new ArrayList<>();
            for (Line l : d.lines()) lines.add(Map.of("title", l.title(), "target", l.target(), "unit", l.unit(), "step", l.step()));
            planned.add(new PlanHabit(d.title(), StandardPlan.TARGET_MINUTES, StandardPlan.XP_REWARD, d.weekdays(), lines));
        }
        importer.importPlan(userId, new ImportHabitPlanRequest(startDate, List.of(new PlanGoal(StandardPlan.TITLE, "HEALTH", StandardPlan.description(variant), planned))));
        return new Started(true, current(userId));
    }

    private Optional<GoalDto> find(UUID userId) {
        return goals.list(userId).stream()
            .filter(g -> RecordStatus.ACTIVE.name().equals(g.status()) && StandardPlan.TITLE.equalsIgnoreCase(g.title().trim()))
            .findFirst();
    }

    /** The version the account's body goal calls for (ADR-044). */
    private Variant suggested(UUID userId) { return StandardPlan.variantFor(bodyGoals.basis(userId)); }

    private TrainingPlanDto fromAccount(UUID userId, GoalDto goal, Variant suggested) {
        List<Session> sessions = habits.list(userId).stream()
            .filter(h -> h.goalId().equals(goal.id()) && RecordStatus.ACTIVE.name().equals(h.status()))
            .sorted(Comparator.comparing(HabitDto::title))
            .map(h -> new Session(h.id(), h.title(), h.targetMinutes(), h.xpReward(), h.weekdays(),
                h.objectives().stream().map(o -> new Line(o.title(), o.target(), o.unit(), o.step())).toList()))
            .toList();
        return new TrainingPlanDto(true, goal.id(), goal.title(), goal.description(), sessions, StandardPlan.variantOf(goal.description()).map(Enum::name).orElse(null), suggested.name());
    }

    private static TrainingPlanDto template(Variant v) {
        List<Session> sessions = StandardPlan.days(v).stream()
            .map(d -> new Session(null, d.title(), StandardPlan.TARGET_MINUTES, StandardPlan.XP_REWARD, d.weekdays(), d.lines())).toList();
        return new TrainingPlanDto(false, null, StandardPlan.TITLE, StandardPlan.description(v), sessions, v.name(), v.name());
    }
}
