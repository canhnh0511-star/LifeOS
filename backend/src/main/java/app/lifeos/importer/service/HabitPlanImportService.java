package app.lifeos.importer.service;

import app.lifeos.common.error.ApiException;
import app.lifeos.common.error.FieldErrors;
import app.lifeos.goal.dto.CreateGoalRequest;
import app.lifeos.goal.dto.GoalDto;
import app.lifeos.goal.service.GoalService;
import app.lifeos.habit.dto.CreateHabitRequest;
import app.lifeos.habit.dto.HabitDto;
import app.lifeos.habit.service.HabitService;
import app.lifeos.importer.dto.ImportHabitPlanRequest;
import app.lifeos.importer.dto.ImportHabitPlanRequest.PlanGoal;
import app.lifeos.importer.dto.ImportHabitPlanRequest.PlanHabit;
import app.lifeos.importer.dto.ImportedHabitPlanDto;
import app.lifeos.lifecycle.model.RecordStatus;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates several goals and their habits in one transaction. Every record goes through the same
 * {@link GoalService#create} and {@link HabitService#create} as the single-record endpoints, so no limit can be bypassed;
 * any problem rolls the whole plan back.
 */
@Service
public class HabitPlanImportService {
    static final int MAX_GOALS = 10;
    static final int MAX_HABITS = 50;
    private static final Logger log = LoggerFactory.getLogger(HabitPlanImportService.class);

    private final GoalService goals;
    private final HabitService habits;

    public HabitPlanImportService(GoalService goals, HabitService habits) { this.goals = goals; this.habits = habits; }

    @Transactional
    public ImportedHabitPlanDto importPlan(UUID userId, ImportHabitPlanRequest req) {
        List<PlanGoal> plan = req.goals();
        checkShape(plan);
        rejectDuplicateTitles(userId, plan);

        FieldErrors errors = new FieldErrors();
        List<GoalDto> createdGoals = new ArrayList<>();
        List<HabitDto> createdHabits = new ArrayList<>();
        for (int i = 0; i < plan.size(); i++) {
            PlanGoal g = plan.get(i);
            String goalPrefix = "goals[" + i + "].";
            GoalDto goal = attempt(errors, goalPrefix, () -> goals.create(userId, new CreateGoalRequest(g.title(), g.category(), g.description())));
            boolean noHabits = g.habits() == null || g.habits().isEmpty();
            if (noHabits) errors.add(goalPrefix + "habits", "Cần ít nhất một thói quen.");
            if (goal == null || noHabits) continue; // habits cannot be validated without a goal to hang them on
            createdGoals.add(goal);
            for (int j = 0; j < g.habits().size(); j++) {
                PlanHabit h = g.habits().get(j);
                if (h == null) { errors.add(goalPrefix + "habits[" + j + "]", "Thói quen không hợp lệ."); continue; }
                String habitPrefix = goalPrefix + "habits[" + j + "].";
                HabitDto habit = attempt(errors, habitPrefix, () -> habits.create(userId,
                    new CreateHabitRequest(goal.id(), h.title(), h.targetMinutes(), h.xpReward(), h.weekdays(), req.startDate())));
                if (habit != null) createdHabits.add(habit);
            }
        }
        errors.throwIfAny(); // rolls back everything created above
        log.info("plan.imported userId={} goals={} habits={}", userId, createdGoals.size(), createdHabits.size());
        return new ImportedHabitPlanDto(createdGoals, createdHabits);
    }

    /** Plan-level limits stop the import early; problems inside one goal are collected with the field errors. */
    private static void checkShape(List<PlanGoal> plan) {
        FieldErrors errors = new FieldErrors();
        if (plan == null || plan.isEmpty()) errors.add("goals", "Cần ít nhất một mục tiêu.");
        else if (plan.size() > MAX_GOALS) errors.add("goals", "Tối đa " + MAX_GOALS + " mục tiêu mỗi lần nhập.");
        else if (plan.stream().anyMatch(g -> g == null)) errors.add("goals", "Mục tiêu không hợp lệ.");
        else if (plan.stream().mapToInt(g -> g.habits() == null ? 0 : g.habits().size()).sum() > MAX_HABITS) {
            errors.add("goals", "Tối đa " + MAX_HABITS + " thói quen mỗi lần nhập.");
        }
        errors.throwIfAny();
    }

    /** Importing the same file twice must not silently double every quest and its XP. */
    private void rejectDuplicateTitles(UUID userId, List<PlanGoal> plan) {
        Set<String> taken = new HashSet<>();
        for (GoalDto g : goals.list(userId)) if (g.status().equals(RecordStatus.ACTIVE.name())) taken.add(key(g.title()));
        for (PlanGoal g : plan) {
            if (g.title() == null || g.title().isBlank()) continue; // reported as a field error by GoalService
            if (!taken.add(key(g.title()))) {
                throw new ApiException(HttpStatus.CONFLICT, "PLAN_ALREADY_IMPORTED", "Mục tiêu \"" + g.title().trim() + "\" đã tồn tại; kế hoạch này có thể đã được nhập.");
            }
        }
    }

    private static String key(String title) { return title.trim().toLowerCase(Locale.ROOT); }

    /** Runs one create, re-keying its field errors under the record's position in the plan. */
    private static <T> T attempt(FieldErrors errors, String prefix, java.util.function.Supplier<T> create) {
        try {
            return create.get();
        } catch (ApiException e) {
            if (!"VALIDATION_FAILED".equals(e.code())) throw e;
            // startDate is shared by the whole plan, so it keeps one top-level key instead of repeating per habit.
            e.fields().forEach((field, message) -> errors.add(field.equals("startDate") ? field : prefix + field, message));
            return null;
        }
    }
}
