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
    static final String DESCRIPTION =
        "Dành cho người mới, mục tiêu giảm mỡ và săn chắc trong 100 ngày (14 tuần). "
        + "Toàn thân 3 buổi (thứ 2, 4, 6), mỗi buổi 6 bài 3 set, nghỉ 60–90 giây, dừng khi còn dư 2–3 rep. "
        + "Chọn máy và tạ đơn, không nhảy và không chống đẩy sàn để nhẹ khớp gối, cổ chân. "
        + "Tuần 1–4 làm quen với tạ nhẹ, tuần 5–10 tăng tạ 2,5–5% khi đủ số rep ở mọi set, tuần 11–14 giảm nghỉ còn 45–60 giây. "
        + "Thứ 3 và thứ 7: đi bộ nhanh hoặc dốc nhẹ 30–40 phút; thứ 5 và chủ nhật nghỉ. "
        + "Ăn thấp hơn mức duy trì khoảng 400–500 kcal, đạm 1,6–2 g/kg cân nặng mục tiêu, ngủ 7–8 giờ; giảm hợp lý 0,5–0,8 kg mỗi tuần.";
    static final int TARGET_MINUTES = 55;
    static final int XP_REWARD = 50;

    record Day(String title, List<Integer> weekdays, List<Line> lines) {}

    static final List<Day> DAYS = List.of(
        new Day("Buổi A — Toàn thân (đẩy, kéo, chân)", List.of(1), List.of(
            reps("Leg Press", 3, 12), reps("Machine Chest Press", 3, 10), reps("Lat Pulldown", 3, 10),
            reps("Dumbbell Shoulder Press", 3, 10), reps("Glute Bridge", 3, 12), hold("Plank", 3, 30))),
        new Day("Buổi B — Toàn thân (tạ đơn)", List.of(3), List.of(
            reps("Goblet Squat", 3, 10), reps("Machine Chest Press", 3, 12), reps("One-arm Dumbbell Row", 3, 10),
            reps("Dumbbell Romanian Deadlift", 3, 10), reps("Dumbbell Lateral Raise", 3, 12), reps("Bird Dog", 3, 10))),
        new Day("Buổi C — Toàn thân (chân, lưng, vai)", List.of(5), List.of(
            reps("Leg Press", 3, 12), reps("Lat Pulldown", 3, 12), reps("Dumbbell Shoulder Press", 3, 10),
            reps("Dumbbell Romanian Deadlift", 3, 10), reps("Glute Bridge", 3, 15), hold("Plank", 3, 30))));

    private StandardPlan() {}

    /** One tap on the client adds one set of `perSet`, so the target is all repetitions of all sets. */
    private static Line reps(String name, int sets, int perSet) { return new Line(name, sets * perSet, "rep", perSet); }

    private static Line hold(String name, int sets, int seconds) { return new Line(name, sets * seconds, "giây", seconds); }
}
