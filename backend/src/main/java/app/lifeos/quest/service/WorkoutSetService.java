package app.lifeos.quest.service;

import app.lifeos.common.error.ApiException;
import app.lifeos.common.error.FieldErrors;
import app.lifeos.common.time.UserClock;
import app.lifeos.habit.model.Habit;
import app.lifeos.habit.repository.HabitRepository;
import app.lifeos.habit.repository.HabitScheduleVersionRepository;
import app.lifeos.identity.repository.UserRepository;
import app.lifeos.quest.dto.WorkoutSetDto;
import app.lifeos.quest.model.WorkoutSet;
import app.lifeos.quest.repository.WorkoutSetRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Workout set log (ADR-037): which sets of which exercise were done on a scheduled quest. Writing is idempotent by
 * (quest, exercise, set number) and never touches XP, the ledger, streaks, chests or the quest's own state.
 */
@Service
public class WorkoutSetService {
    private static final Logger log = LoggerFactory.getLogger(WorkoutSetService.class);
    static final int MAX_BACKDATE_DAYS = 7;
    static final int MAX_SET_NO = 50;
    static final int MAX_REPS = 1000;
    static final int MAX_SETS_PER_QUEST = 300;
    static final BigDecimal MAX_WEIGHT = new BigDecimal("1000");

    private final HabitRepository habits;
    private final HabitScheduleVersionRepository schedules;
    private final WorkoutSetRepository sets;
    private final UserRepository users;
    private final UserClock clock;
    private final EntityManager em;

    public WorkoutSetService(HabitRepository habits, HabitScheduleVersionRepository schedules, WorkoutSetRepository sets, UserRepository users, UserClock clock, EntityManager em) {
        this.habits = habits; this.schedules = schedules; this.sets = sets; this.users = users; this.clock = clock; this.em = em;
    }

    private void lock(UUID userId) {
        em.createNativeQuery("select pg_advisory_xact_lock(hashtext(:k))").setParameter("k", "sets:" + userId).getSingleResult();
    }

    /** Reading is allowed for any day the habit existed, so history stays viewable after the edit window. */
    @Transactional(readOnly = true)
    public List<WorkoutSetDto> list(UUID userId, String habitId, String dateText) {
        Habit habit = findHabit(userId, habitId);
        return view(userId, habit.getId(), parseDate(dateText));
    }

    @Transactional
    public List<WorkoutSetDto> record(UUID userId, String habitId, String dateText, String exerciseText, Object setNo, Object reps, Object weightKg) {
        lock(userId);
        Habit habit = findHabit(userId, habitId);
        LocalDate day = parseDate(dateText);
        requireEditable(userId, habit, day);
        FieldErrors errors = new FieldErrors();
        String exercise = exerciseText == null ? "" : exerciseText.trim();
        if (exercise.isEmpty() || exercise.length() > 100) errors.add("exercise", "Tên bài tập từ 1 đến 100 ký tự.");
        int no = wholeNumber(errors, "setNo", setNo, 1, MAX_SET_NO, "Số set phải là số nguyên từ 1 đến " + MAX_SET_NO + ".");
        int r = wholeNumber(errors, "reps", reps, 1, MAX_REPS, "Số rep phải là số nguyên từ 1 đến " + MAX_REPS + ".");
        BigDecimal weight = null;
        if (weightKg != null) {
            if (!(weightKg instanceof Number n) || !Double.isFinite(n.doubleValue())) errors.add("weightKg", "Mức tạ phải là một số.");
            else {
                weight = new BigDecimal(n.toString()).setScale(2, RoundingMode.HALF_UP);
                if (weight.signum() < 0 || weight.compareTo(MAX_WEIGHT) > 0) errors.add("weightKg", "Mức tạ từ 0 đến 1000 kg.");
            }
        }
        errors.throwIfAny();
        WorkoutSet existing = sets.findOne(userId, habit.getId(), day, exercise, no).orElse(null);
        if (existing == null) {
            if (sets.countByUserIdAndHabitIdAndEntryDate(userId, habit.getId(), day) >= MAX_SETS_PER_QUEST) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "TOO_MANY_SETS", "Tối đa " + MAX_SETS_PER_QUEST + " set cho một buổi tập.");
            }
            sets.save(new WorkoutSet(userId, habit.getId(), day, exercise, no, r, weight, clock.now()));
        } else existing.change(r, weight, clock.now());
        sets.flush();
        log.info("workoutset.recorded userId={} habitId={} date={} setNo={}", userId, habit.getId(), day, no);
        return view(userId, habit.getId(), day);
    }

    @Transactional
    public List<WorkoutSetDto> remove(UUID userId, String habitId, String dateText, String exerciseText, int setNo) {
        lock(userId);
        Habit habit = findHabit(userId, habitId);
        LocalDate day = parseDate(dateText);
        requireEditable(userId, habit, day);
        String exercise = exerciseText == null ? "" : exerciseText.trim();
        sets.findOne(userId, habit.getId(), day, exercise, setNo).ifPresent(sets::delete);
        sets.flush();
        return view(userId, habit.getId(), day);
    }

    @Transactional(readOnly = true)
    public WorkoutSetDto.Last last(UUID userId, String exerciseText, String beforeText) {
        String exercise = exerciseText == null ? "" : exerciseText.trim();
        if (exercise.isEmpty() || exercise.length() > 100) { new FieldErrors().add("exercise", "Tên bài tập từ 1 đến 100 ký tự.").throwIfAny(); }
        LocalDate before = parseDate(beforeText, "before");
        LocalDate day = sets.lastDay(userId, exercise, before);
        if (day == null) return new WorkoutSetDto.Last(null, List.of());
        return new WorkoutSetDto.Last(day, sets.onDay(userId, exercise, day).stream().map(WorkoutSetService::dto).toList());
    }

    private List<WorkoutSetDto> view(UUID userId, UUID habitId, LocalDate day) {
        return sets.findByUserIdAndHabitIdAndEntryDateOrderByExerciseAscSetNoAsc(userId, habitId, day).stream().map(WorkoutSetService::dto).toList();
    }

    private static WorkoutSetDto dto(WorkoutSet s) { return new WorkoutSetDto(s.getExercise(), s.getSetNo(), s.getReps(), s.getWeightKg() == null ? null : s.getWeightKg().doubleValue()); }

    /** Same window and schedule rule as completing a quest: from today back 7 days, and only on a day the habit was scheduled. */
    private void requireEditable(UUID userId, Habit habit, LocalDate day) {
        LocalDate today = clock.today(users.findById(userId).orElseThrow().getTimezone());
        if (day.isAfter(today)) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "QUEST_IN_FUTURE", "Chưa thể ghi set cho ngày trong tương lai.");
        if (ChronoUnit.DAYS.between(day, today) > MAX_BACKDATE_DAYS) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "QUEST_TOO_OLD", "Chỉ có thể ghi set trong 7 ngày gần nhất.");
        if (!QuestRules.isScheduled(habit, schedules.findByHabitIdInOrderByEffectiveFromAsc(List.of(habit.getId())), day)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "QUEST_OUTSIDE_SCHEDULE", "Ngày này không thuộc lịch thực hiện của thói quen.");
        }
    }

    /** Numbers arrive as Object so "x", 1.5, null or true are field errors (422) instead of unreadable JSON. */
    private static int wholeNumber(FieldErrors errors, String field, Object value, int min, int max, String message) {
        if (value instanceof Integer i && i >= min && i <= max) return i;
        errors.add(field, message);
        return 0;
    }

    private Habit findHabit(UUID userId, String habitId) {
        try { return habits.findByIdAndUserId(UUID.fromString(habitId), userId).orElseThrow(() -> FieldErrors.notFound("thói quen")); }
        catch (IllegalArgumentException e) { throw FieldErrors.notFound("thói quen"); }
    }

    private static LocalDate parseDate(String value) { return parseDate(value, "date"); }

    private static LocalDate parseDate(String value, String field) {
        try { return LocalDate.parse(value); }
        catch (DateTimeException | NullPointerException e) { new FieldErrors().add(field, "Ngày phải có dạng YYYY-MM-DD.").throwIfAny(); return null; }
    }
}
