package app.lifeos.plan;

import app.lifeos.plan.TrainingPlanDto.Line;
import java.util.List;

/**
 * The one gym plan every account starts from: three full-body sessions on Monday, Wednesday and Friday, six exercises of three sets each.
 * Exercise names are the canonical English names of the client's exercise library (they are the storage key of checklist lines and of the set log).
 * The title keeps the "Gym — " prefix the client uses to recognise a gym plan.
 */
final class StandardPlan {
    static final String TITLE = "Gym — Tăng cơ · giảm mỡ toàn thân (3 buổi)";
    static final String DESCRIPTION = "Toàn thân 3 buổi (thứ 2, 4, 6), mỗi buổi 6 bài 3 set × 10–12 rep, nghỉ 60–90 giây, dừng khi còn đủ sức làm thêm 2 rep. "
        + "Thứ 3 và thứ 7: cardio nhẹ 30–40 phút (đi bộ dốc, đạp xe). Chủ nhật nghỉ. Ăn thấp hơn mức duy trì khoảng 500 kcal, đủ đạm. "
        + "Khi làm đủ 3 × 12 thoải mái thì tăng tạ 2,5–5%.";
    static final int TARGET_MINUTES = 55;
    static final int XP_REWARD = 50;

    record Day(String title, List<Integer> weekdays, List<Line> lines) {}

    static final List<Day> DAYS = List.of(
        new Day("Buổi A — Toàn thân (đẩy, kéo, chân)", List.of(1), List.of(
            reps("Leg Press", 3, 12), reps("Machine Chest Press", 3, 10), reps("Lat Pulldown", 3, 10),
            reps("Dumbbell Shoulder Press", 3, 10), reps("Glute Bridge", 3, 12), hold("Plank", 3, 40))),
        new Day("Buổi B — Toàn thân (tạ đơn)", List.of(3), List.of(
            reps("Goblet Squat", 3, 10), reps("Push-up", 3, 10), reps("One-arm Dumbbell Row", 3, 10),
            reps("Dumbbell Romanian Deadlift", 3, 10), reps("Dumbbell Lateral Raise", 3, 12), reps("Bird Dog", 3, 10))),
        new Day("Buổi C — Toàn thân (kết hợp)", List.of(5), List.of(
            reps("Leg Press", 3, 12), reps("Push-up", 3, 10), reps("One-arm Dumbbell Row", 3, 10),
            reps("Dumbbell Shoulder Press", 3, 10), reps("Glute Bridge", 3, 12), hold("Plank", 3, 40))));

    private StandardPlan() {}

    /** One tap on the client adds one set of `perSet`, so the target is all repetitions of all sets. */
    private static Line reps(String name, int sets, int perSet) { return new Line(name, sets * perSet, "rep", perSet); }

    private static Line hold(String name, int sets, int seconds) { return new Line(name, sets * seconds, "giây", seconds); }
}
