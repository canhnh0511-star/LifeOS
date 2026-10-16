package app.lifeos.habit.service;

import app.lifeos.common.error.FieldErrors;
import app.lifeos.common.time.UserClock;
import app.lifeos.goal.model.Goal;
import app.lifeos.goal.repository.GoalRepository;
import app.lifeos.goal.service.PatchRules;
import app.lifeos.habit.dto.CreateHabitRequest;
import app.lifeos.habit.dto.HabitDto;
import app.lifeos.habit.dto.HabitObjectiveDto;
import app.lifeos.habit.model.HabitObjective;
import app.lifeos.habit.repository.HabitObjectiveRepository;
import app.lifeos.habit.model.Habit;
import app.lifeos.habit.model.HabitScheduleVersion;
import app.lifeos.habit.repository.HabitRepository;
import app.lifeos.habit.repository.HabitScheduleVersionRepository;
import app.lifeos.identity.model.User;
import app.lifeos.identity.repository.UserRepository;
import app.lifeos.lifecycle.model.LifecycleEvent;
import app.lifeos.lifecycle.model.RecordStatus;
import app.lifeos.lifecycle.service.LifecycleService;
import app.lifeos.quest.service.QuestService;
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
    private final QuestService quests;
    private final HabitObjectiveRepository objectives;

    public HabitService(HabitObjectiveRepository objectives, QuestService quests, HabitRepository habits, HabitScheduleVersionRepository schedules, GoalRepository goals, UserRepository users,
                        LifecycleService lifecycle, UserClock clock) {
        this.objectives = objectives; this.quests = quests; this.habits = habits; this.schedules = schedules; this.goals = goals; this.users = users; this.lifecycle = lifecycle; this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<HabitDto> list(UUID userId) {
        List<Habit> mine = habits.findByUserIdOrderByCreatedAtAsc(userId);
        Map<UUID, List<Integer>> latest = latestWeekdays(mine.stream().map(Habit::getId).collect(Collectors.toSet()));
        Map<UUID, List<HabitObjectiveDto>> lists = objectivesOf(mine.stream().map(Habit::getId).collect(Collectors.toSet()));
        return mine.stream().map(h -> HabitDto.of(h, latest.getOrDefault(h.getId(), List.of()), lists.getOrDefault(h.getId(), List.of()))).toList();
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
        List<ObjectiveRules.Parsed> checklist = ObjectiveRules.parse(req.objectives(), errors, "");
        LocalDate start = parseDate(req.startDate());
        if (start == null) errors.add("startDate", "Ngày bắt đầu phải có dạng YYYY-MM-DD.");
        else if (start.isBefore(clock.today(user.getTimezone()))) errors.add("startDate", "Thói quen chỉ có thể bắt đầu từ hôm nay trở đi.");
        errors.throwIfAny();

        Habit habit = habits.save(new Habit(userId, goal.getId(), req.title().trim(), req.targetMinutes(), req.xpReward(), start, clock.now()));
        Set<Integer> days = new TreeSet<>(req.weekdays());
        schedules.save(new HabitScheduleVersion(habit.getId(), start, days));
        List<HabitObjectiveDto> saved = saveObjectives(habit.getId(), checklist);
        log.info("habit.created userId={} habitId={} goalId={} weekdays={} startDate={} objectives={}", userId, habit.getId(), goal.getId(), days, start, saved.size());
        return HabitDto.of(habit, List.copyOf(days), saved);
    }

    private static final Set<String> PATCHABLE = Set.of("status", "title", "targetMinutes", "xpReward", "weekdays", "endDate", "objectives");

    /**
     * Edits a habit (B-10, ADR-030). Nothing here rewrites a lived day: a new weekly schedule and status changes apply from the user's
     * next local day (a new immutable schedule version / lifecycle event), `endDate` can only shorten or set the future, `xpReward`
     * affects only quests not yet created, and name/duration are display data. An archived habit is final.
     */
    @Transactional
    public HabitDto update(UUID userId, UUID habitId, Map<String, Object> patch) {
        PatchRules.requireKeys(patch, PATCHABLE);
        Habit habit = habits.lockByIdAndUserId(habitId, userId).orElseThrow(() -> FieldErrors.notFound("thói quen"));
        // Re-sending the archive request is a no-op, so a client retry after a timeout does not look like a failure.
        if (habit.getStatus() == RecordStatus.ARCHIVED && patch.size() == 1 && "ARCHIVED".equals(patch.get("status"))) {
            return dto(habit);
        }
        User user = users.findById(userId).orElseThrow();
        LocalDate today = clock.today(user.getTimezone());
        FieldErrors errors = new FieldErrors();
        if (habit.getStatus() == RecordStatus.ARCHIVED) errors.add("patch", "Thói quen đã lưu trữ nên không thể chỉnh sửa.");

        String title = null; Integer minutes = null, xp = null; Set<Integer> days = null; RecordStatus status = null;
        if (patch.containsKey("title")) {
            if (!(patch.get("title") instanceof String t) || t.isBlank()) errors.add("title", "Tên thói quen không được để trống.");
            else if (t.trim().length() > 150) errors.add("title", "Tên thói quen tối đa 150 ký tự.");
            else title = t.trim();
        }
        if (patch.containsKey("targetMinutes")) {
            if (!(patch.get("targetMinutes") instanceof Integer m) || m < 1 || m > 480) errors.add("targetMinutes", "Thời lượng phải là số nguyên từ 1 đến 480 phút.");
            else minutes = m;
        }
        if (patch.containsKey("xpReward")) {
            if (!(patch.get("xpReward") instanceof Integer x) || x < 0 || x > 100) errors.add("xpReward", "XP thưởng phải là số nguyên từ 0 đến 100.");
            else xp = x;
        }
        if (patch.containsKey("weekdays")) {
            if (patch.get("weekdays") instanceof List<?> list && !list.isEmpty() && list.stream().allMatch(d -> d instanceof Integer i && i >= 1 && i <= 7)) {
                days = new TreeSet<>(); for (Object d : list) days.add((Integer) d);
            } else errors.add("weekdays", "Chọn ít nhất một ngày trong tuần (1 đến 7).");
        }
        if (patch.containsKey("status")) {
            status = RecordStatus.parse(patch.get("status"));
            if (status == null) errors.add("status", "Trạng thái không hợp lệ.");
        }
        boolean objectivesGiven = patch.containsKey("objectives");
        List<ObjectiveRules.Parsed> checklist = objectivesGiven ? ObjectiveRules.parse(patch.get("objectives") == null ? List.of() : patch.get("objectives"), errors, "") : null;
        boolean endDateGiven = patch.containsKey("endDate");
        LocalDate endDate = null;
        if (endDateGiven) {
            Object raw = patch.get("endDate");
            if (habit.getEndDate() != null && habit.getEndDate().isBefore(today)) errors.add("endDate", "Thói quen đã kết thúc nên không thể đổi ngày kết thúc.");
            else if (raw != null) {
                endDate = raw instanceof String s ? parseDate(s) : null;
                if (endDate == null) errors.add("endDate", "Ngày kết thúc phải có dạng YYYY-MM-DD.");
                else if (endDate.isBefore(today)) errors.add("endDate", "Ngày kết thúc không được ở quá khứ.");
                else if (endDate.isBefore(habit.getStartDate())) errors.add("endDate", "Ngày kết thúc phải sau ngày bắt đầu.");
            }
        }
        errors.throwIfAny();

        if (title != null) habit.setTitle(title);
        if (minutes != null) habit.setTargetMinutes(minutes);
        boolean checklistChanges = objectivesGiven && !sameChecklist(habit.getId(), checklist);
        // Lived days that were never opened would otherwise pick up the new reward/checklist when they are first created.
        if ((xp != null && xp != habit.getXpReward()) || checklistChanges) quests.freezeLivedDays(userId, habitId);
        if (xp != null && xp != habit.getXpReward()) habit.setXpReward(xp);
        if (checklistChanges) { objectives.deleteByHabitId(habitId); objectives.flush(); saveObjectives(habitId, checklist); }
        if (endDateGiven) habit.setEndDate(endDate);
        if (days != null) changeSchedule(habit, days, today.plusDays(1).isBefore(habit.getStartDate()) ? habit.getStartDate() : today.plusDays(1));
        if (status != null && status != habit.getStatus()) {
            var effective = lifecycle.recordChange(user, LifecycleEvent.Subject.HABIT, habitId, status);
            log.info("habit.status_changed userId={} habitId={} from={} to={} effectiveDate={}", userId, habitId, habit.getStatus(), status, effective);
            habit.setStatus(status);
        }
        log.info("habit.updated userId={} habitId={} fields={}", userId, habitId, patch.keySet());
        return dto(habit);
    }

    /** Adds a schedule version from `effective`. A second change on the same day replaces the first (it has not applied to any day yet). */
    private void changeSchedule(Habit habit, Set<Integer> days, LocalDate effective) {
        List<HabitScheduleVersion> versions = schedules.findByHabitIdInOrderByEffectiveFromAsc(Set.of(habit.getId()));
        if (!versions.isEmpty() && versions.get(versions.size() - 1).weekdays().equals(List.copyOf(days))) return;
        for (HabitScheduleVersion v : versions) {
            if (v.getEffectiveFrom().equals(effective)) { schedules.delete(v); schedules.flush(); }
        }
        schedules.save(new HabitScheduleVersion(habit.getId(), effective, days));
        log.info("habit.schedule_changed habitId={} weekdays={} effectiveFrom={}", habit.getId(), days, effective);
    }

    private HabitDto dto(Habit habit) {
        UUID id = habit.getId();
        return HabitDto.of(habit, latestWeekdays(Set.of(id)).getOrDefault(id, List.of()), objectivesOf(Set.of(id)).getOrDefault(id, List.of()));
    }

    private Map<UUID, List<HabitObjectiveDto>> objectivesOf(Set<UUID> habitIds) {
        Map<UUID, List<HabitObjectiveDto>> out = new HashMap<>();
        if (habitIds.isEmpty()) return out;
        for (HabitObjective o : objectives.findByHabitIdInOrderByHabitIdAscPositionAsc(habitIds)) out.computeIfAbsent(o.getHabitId(), k -> new java.util.ArrayList<>()).add(HabitObjectiveDto.of(o));
        return out;
    }

    private List<HabitObjectiveDto> saveObjectives(UUID habitId, List<ObjectiveRules.Parsed> checklist) {
        List<HabitObjectiveDto> saved = new java.util.ArrayList<>();
        for (int i = 0; i < checklist.size(); i++) {
            ObjectiveRules.Parsed p = checklist.get(i);
            saved.add(HabitObjectiveDto.of(objectives.save(new HabitObjective(habitId, i, p.title(), p.target(), p.unit(), p.step()))));
        }
        return saved;
    }

    private boolean sameChecklist(UUID habitId, List<ObjectiveRules.Parsed> next) {
        List<ObjectiveRules.Parsed> current = objectivesOf(Set.of(habitId)).getOrDefault(habitId, List.of()).stream()
            .map(o -> new ObjectiveRules.Parsed(o.title(), o.target(), o.unit(), o.step())).toList();
        return current.equals(next);
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
