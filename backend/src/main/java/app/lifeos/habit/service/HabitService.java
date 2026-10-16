package app.lifeos.habit.service;

import app.lifeos.common.error.FieldErrors;
import app.lifeos.common.time.UserClock;
import app.lifeos.goal.model.Goal;
import app.lifeos.goal.repository.GoalRepository;
import app.lifeos.goal.service.PatchRules;
import app.lifeos.habit.dto.CreateHabitRequest;
import app.lifeos.habit.dto.HabitDto;
import app.lifeos.habit.model.Habit;
import app.lifeos.habit.model.HabitScheduleVersion;
import app.lifeos.habit.repository.HabitRepository;
import app.lifeos.habit.repository.HabitScheduleVersionRepository;
import app.lifeos.identity.model.User;
import app.lifeos.identity.repository.UserRepository;
import app.lifeos.lifecycle.model.LifecycleEvent;
import app.lifeos.lifecycle.model.RecordStatus;
import app.lifeos.lifecycle.service.LifecycleService;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HabitService {
    private static final Logger log = LoggerFactory.getLogger(HabitService.class);

    private final HabitRepository habits;
    private final HabitScheduleVersionRepository schedules;
    private final GoalRepository goals;
    private final UserRepository users;
    private final LifecycleService lifecycle;
    private final UserClock clock;

    public HabitService(HabitRepository habits, HabitScheduleVersionRepository schedules, GoalRepository goals, UserRepository users,
                        LifecycleService lifecycle, UserClock clock) {
        this.habits = habits; this.schedules = schedules; this.goals = goals; this.users = users; this.lifecycle = lifecycle; this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<HabitDto> list(UUID userId) {
        List<Habit> mine = habits.findByUserIdOrderByCreatedAtAsc(userId);
        Map<UUID, List<Integer>> latest = latestWeekdays(mine.stream().map(Habit::getId).collect(Collectors.toSet()));
        return mine.stream().map(h -> HabitDto.of(h, latest.getOrDefault(h.getId(), List.of()))).toList();
    }

    @Transactional
    public HabitDto create(UUID userId, CreateHabitRequest req) {
        User user = users.findById(userId).orElseThrow();
        FieldErrors errors = new FieldErrors();
        if (!(req.title() instanceof String t) || t.isBlank()) errors.add("title", "Tên thói quen không được để trống.");
        else if (t.trim().length() > 150) errors.add("title", "Tên thói quen tối đa 150 ký tự.");
        Goal goal = findGoal(userId, req.goalId());
        if (goal == null) errors.add("goalId", "Không tìm thấy mục tiêu.");
        else if (goal.getStatus() != RecordStatus.ACTIVE) errors.add("goalId", "Vui lòng chọn mục tiêu đang hoạt động.");
        if (req.targetMinutes() == null || req.targetMinutes() < 1 || req.targetMinutes() > 480) errors.add("targetMinutes", "Thời lượng phải là số nguyên từ 1 đến 480 phút.");
        if (req.xpReward() == null || req.xpReward() < 0 || req.xpReward() > 100) errors.add("xpReward", "XP thưởng phải là số nguyên từ 0 đến 100.");
        if (req.weekdays() == null || req.weekdays().isEmpty() || req.weekdays().stream().anyMatch(d -> d == null || d < 1 || d > 7)) {
            errors.add("weekdays", "Chọn ít nhất một ngày trong tuần (1 đến 7).");
        }
        LocalDate start = parseDate(req.startDate());
        if (start == null) errors.add("startDate", "Ngày bắt đầu phải có dạng YYYY-MM-DD.");
        else if (start.isBefore(clock.today(user.getTimezone()))) errors.add("startDate", "Thói quen chỉ có thể bắt đầu từ hôm nay trở đi.");
        errors.throwIfAny();

        Habit habit = habits.save(new Habit(userId, goal.getId(), req.title().trim(), req.targetMinutes(), req.xpReward(), start, clock.now()));
        Set<Integer> days = new TreeSet<>(req.weekdays());
        schedules.save(new HabitScheduleVersion(habit.getId(), start, days));
        log.info("habit.created userId={} habitId={} goalId={} weekdays={} startDate={}", userId, habit.getId(), goal.getId(), days, start);
        return HabitDto.of(habit, List.copyOf(days));
    }

    /** Only `status` is patchable; a change applies from the user's next local day. */
    @Transactional
    public HabitDto update(UUID userId, UUID habitId, Map<String, Object> patch) {
        PatchRules.requireKeys(patch, Set.of("status"));
        Habit habit = habits.findByIdAndUserId(habitId, userId).orElseThrow(() -> FieldErrors.notFound("thói quen"));
        RecordStatus status = RecordStatus.parse(patch.get("status"));
        if (status == null) new FieldErrors().add("status", "Trạng thái không hợp lệ.").throwIfAny();
        if (status != habit.getStatus()) {
            User user = users.findById(userId).orElseThrow();
            var effective = lifecycle.recordChange(user, LifecycleEvent.Subject.HABIT, habitId, status);
            log.info("habit.status_changed userId={} habitId={} from={} to={} effectiveDate={}", userId, habitId, habit.getStatus(), status, effective);
            habit.setStatus(status);
        }
        return HabitDto.of(habit, latestWeekdays(Set.of(habitId)).getOrDefault(habitId, List.of()));
    }

    private Goal findGoal(UUID userId, String goalId) {
        if (goalId == null) return null;
        try { return goals.findByIdAndUserId(UUID.fromString(goalId), userId).orElse(null); }
        catch (IllegalArgumentException e) { return null; }
    }

    private Map<UUID, List<Integer>> latestWeekdays(Set<UUID> habitIds) {
        Map<UUID, List<Integer>> latest = new HashMap<>();
        if (habitIds.isEmpty()) return latest;
        // Ordered by effective_from ascending, so the last version per habit wins.
        for (HabitScheduleVersion v : schedules.findByHabitIdInOrderByEffectiveFromAsc(habitIds)) latest.put(v.getHabitId(), v.weekdays());
        return latest;
    }

    private static LocalDate parseDate(String value) {
        if (value == null) return null;
        try { return LocalDate.parse(value); } catch (DateTimeException e) { return null; }
    }
}
