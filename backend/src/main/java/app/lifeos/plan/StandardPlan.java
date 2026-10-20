package app.lifeos.plan;

import app.lifeos.measure.goal.BodyGoalService.Basis;
import app.lifeos.plan.TrainingPlanDto.Line;
import java.util.List;
import java.util.Optional;

/**
 * The gym plan every account starts from: three full-body sessions on Monday, Wednesday and Friday, six exercises each. There are three versions
 * of it (ADR-044), picked from the account's body goal: GENTLE (losing weight with a BMI of 30 or more: no floor push-ups, short plank),
 * STANDARD (losing weight with a lower BMI) and BUILD (gaining weight: heavier, more sets). Without a body goal GENTLE is used, the safest for an unknown beginner.
 * Exercise names are the canonical English names of the client's exercise library (they are the storage key of checklist lines and of the set log).
 * The title is the same for every version: it keeps the "Gym — " prefix the client uses to recognise a gym plan, and is how the account's plan is found.
 */
final class StandardPlan {
    static final String TITLE = "Gym — Tăng cơ · giảm mỡ toàn thân (3 buổi)";
    static final int TARGET_MINUTES = 55;
    static final int XP_REWARD = 50;

    enum Variant { GENTLE, STANDARD, BUILD }

    record Day(String title, List<Integer> weekdays, List<Line> lines) {}

    static final String DESCRIPTION_GENTLE =
        "Dành cho người mới, mục tiêu giảm mỡ và săn chắc trong 100 ngày (14 tuần). "
        + "Toàn thân 3 buổi (thứ 2, 4, 6), mỗi buổi 6 bài 3 set, nghỉ 60–90 giây, dừng khi còn dư 2–3 rep. "
        + "Chọn máy và tạ đơn, không nhảy và không chống đẩy sàn để nhẹ khớp gối, cổ chân. "
        + "Tuần 1–4 làm quen với tạ nhẹ, tuần 5–10 tăng tạ 2,5–5% khi đủ số rep ở mọi set, tuần 11–14 giảm nghỉ còn 45–60 giây. "
        + "Thứ 3 và thứ 7: đi bộ nhanh hoặc dốc nhẹ 30–40 phút; thứ 5 và chủ nhật nghỉ. "
        + "Ăn thấp hơn mức duy trì khoảng 400–500 kcal, đạm 1,6–2 g/kg cân nặng mục tiêu, ngủ 7–8 giờ; giảm hợp lý 0,5–0,8 kg mỗi tuần.";
    static final String DESCRIPTION_STANDARD =
        "Dành cho người mới, mục tiêu giảm mỡ trong thời gian bạn đặt. "
        + "Toàn thân 3 buổi (thứ 2, 4, 6), mỗi buổi 6 bài 3 set, nghỉ 60–90 giây, dừng khi còn dư 2 rep. "
        + "Tuần đầu dùng tạ nhẹ để học động tác, sau đó tăng tạ 2,5–5% khi làm đủ số rep ở mọi set. "
        + "Thứ 3 và thứ 7: đi bộ nhanh hoặc đạp xe 30–40 phút; thứ 5 và chủ nhật nghỉ. "
        + "Ăn thấp hơn mức duy trì khoảng 400–500 kcal, đạm 1,6–2 g/kg, ngủ 7–8 giờ; giảm hợp lý 0,5–1 kg mỗi tuần.";
    static final String DESCRIPTION_BUILD =
        "Dành cho người muốn tăng cân và tăng cơ. "
        + "Toàn thân 3 buổi (thứ 2, 4, 6), bài lớn 4 set × 8–10 rep, nghỉ 90–120 giây, dừng khi còn dư 1–2 rep. "
        + "Tăng tạ 2,5–5% khi đủ rep ở mọi set, tăng đều mỗi tuần. "
        + "Thứ 3 và thứ 7: đi bộ nhẹ 20–30 phút; thứ 5 và chủ nhật nghỉ. "
        + "Ăn thừa khoảng 250–300 kcal, đạm 1,6–2,2 g/kg, ngủ 7–9 giờ; tăng hợp lý 0,25–0,5 kg mỗi tuần.";

    static final List<Day> DAYS_GENTLE = List.of(
        new Day("Buổi A — Toàn thân (đẩy, kéo, chân)", List.of(1), List.of(
            reps("Leg Press", 3, 12), reps("Machine Chest Press", 3, 10), reps("Lat Pulldown", 3, 10),
            reps("Dumbbell Shoulder Press", 3, 10), reps("Glute Bridge", 3, 12), hold("Plank", 3, 30))),
        new Day("Buổi B — Toàn thân (tạ đơn)", List.of(3), List.of(
            reps("Goblet Squat", 3, 10), reps("Machine Chest Press", 3, 12), reps("One-arm Dumbbell Row", 3, 10),
            reps("Dumbbell Romanian Deadlift", 3, 10), reps("Dumbbell Lateral Raise", 3, 12), reps("Bird Dog", 3, 10))),
        new Day("Buổi C — Toàn thân (chân, lưng, vai)", List.of(5), List.of(
            reps("Leg Press", 3, 12), reps("Lat Pulldown", 3, 12), reps("Dumbbell Shoulder Press", 3, 10),
            reps("Dumbbell Romanian Deadlift", 3, 10), reps("Glute Bridge", 3, 15), hold("Plank", 3, 30))));

    static final List<Day> DAYS_STANDARD = List.of(
        new Day("Buổi A — Toàn thân (đẩy, kéo, chân)", List.of(1), List.of(
            reps("Leg Press", 3, 12), reps("Machine Chest Press", 3, 10), reps("Lat Pulldown", 3, 10),
            reps("Dumbbell Shoulder Press", 3, 10), reps("Glute Bridge", 3, 12), hold("Plank", 3, 40))),
        new Day("Buổi B — Toàn thân (tạ đơn)", List.of(3), List.of(
            reps("Goblet Squat", 3, 10), reps("Push-up", 3, 10), reps("One-arm Dumbbell Row", 3, 10),
            reps("Dumbbell Romanian Deadlift", 3, 10), reps("Dumbbell Lateral Raise", 3, 12), reps("Bird Dog", 3, 10))),
        new Day("Buổi C — Toàn thân (kết hợp)", List.of(5), List.of(
            reps("Leg Press", 3, 12), reps("Push-up", 3, 10), reps("One-arm Dumbbell Row", 3, 10),
            reps("Dumbbell Shoulder Press", 3, 10), reps("Dumbbell Romanian Deadlift", 3, 10), hold("Plank", 3, 40))));

    static final List<Day> DAYS_BUILD = List.of(
        new Day("Buổi A — Toàn thân (chân, ngực, lưng)", List.of(1), List.of(
            reps("Leg Press", 4, 10), reps("Machine Chest Press", 4, 8), reps("Lat Pulldown", 4, 8),
            reps("Dumbbell Shoulder Press", 3, 10), reps("Glute Bridge", 3, 12), hold("Plank", 3, 40))),
        new Day("Buổi B — Toàn thân (tạ đơn)", List.of(3), List.of(
            reps("Goblet Squat", 4, 10), reps("Push-up", 3, 10), reps("One-arm Dumbbell Row", 4, 8),
            reps("Dumbbell Romanian Deadlift", 4, 8), reps("Dumbbell Lateral Raise", 3, 12), reps("Bird Dog", 3, 10))),
        new Day("Buổi C — Toàn thân (nặng)", List.of(5), List.of(
            reps("Leg Press", 4, 10), reps("Machine Chest Press", 4, 8), reps("Lat Pulldown", 4, 8),
            reps("Dumbbell Shoulder Press", 3, 10), reps("Dumbbell Romanian Deadlift", 3, 10), hold("Plank", 3, 40))));

    /** A light day between the gym sessions (ADR-045): a brisk walk on Tuesday and Saturday, stretching on Thursday. Sunday has no task: it is a real rest day. */
    record Recovery(String title, List<Integer> weekdays, int targetMinutes, int xpReward, List<Line> lines) {}

    static final int WALK_XP = 20;
    static final int STRETCH_XP = 10;
    static final String STRETCH_TITLE = "Giãn cơ phục hồi";

    static final List<Recovery> RECOVERY_GENTLE = recovery("Đi bộ nhanh", 35, "Đi bộ nhanh hoặc dốc nhẹ", 25);
    static final List<Recovery> RECOVERY_STANDARD = recovery("Đi bộ nhanh", 35, "Đi bộ nhanh hoặc đạp xe", 25);
    static final List<Recovery> RECOVERY_BUILD = recovery("Đi bộ nhẹ", 25, "Đi bộ nhẹ", 15);

    private StandardPlan() {}

    private static List<Recovery> recovery(String walkTitle, int walkMinutes, String mainLine, int mainMinutes) {
        return List.of(
            new Recovery(walkTitle, List.of(2, 6), walkMinutes, WALK_XP, List.of(
                new Line("Khởi động: đi bộ chậm", 5, "phút", 5), new Line(mainLine, mainMinutes, "phút", 5), new Line("Thả lỏng: đi bộ chậm", 5, "phút", 5))),
            new Recovery(STRETCH_TITLE, List.of(4), 10, STRETCH_XP, List.of(
                new Line("Giãn đùi trước", 60, "giây", 30), new Line("Giãn đùi sau", 60, "giây", 30), new Line("Mở hông", 60, "giây", 30),
                new Line("Giãn ngực và vai", 60, "giây", 30), new Line("Giãn lưng dưới", 60, "giây", 30))));
    }

    static List<Recovery> recovery(Variant v) { return switch (v) { case GENTLE -> RECOVERY_GENTLE; case STANDARD -> RECOVERY_STANDARD; case BUILD -> RECOVERY_BUILD; }; }

    /** Lower-cased names of every exercise in the gym sessions of any version: how a plan not made from the standard plan is told to be a gym plan. */
    static java.util.Set<String> exerciseNames() {
        java.util.Set<String> names = new java.util.HashSet<>();
        for (Variant v : Variant.values()) for (Day d : days(v)) for (Line l : d.lines()) names.add(l.title().toLowerCase());
        return names;
    }

    /** Titles of the recovery sessions in every version: how an account's plan is told to already have them. */
    static boolean isRecoveryTitle(String title) {
        for (Variant v : Variant.values()) for (Recovery r : recovery(v)) if (r.title().equalsIgnoreCase(title.trim())) return true;
        return false;
    }

    /** The version a body goal calls for: gaining weight is BUILD, losing weight is GENTLE from a BMI of 30 and STANDARD below it; no goal is GENTLE. */
    static Variant variantFor(Optional<Basis> goal) {
        if (goal.isEmpty()) return Variant.GENTLE;
        Basis g = goal.get();
        if (g.targetWeightKg() > g.startWeightKg()) return Variant.BUILD;
        double bmi = g.startWeightKg() / Math.pow(g.heightCm() / 100.0, 2);
        return Math.round(bmi * 10) / 10.0 >= 30 ? Variant.GENTLE : Variant.STANDARD;
    }

    static List<Day> days(Variant v) { return switch (v) { case GENTLE -> DAYS_GENTLE; case STANDARD -> DAYS_STANDARD; case BUILD -> DAYS_BUILD; }; }

    static String description(Variant v) { return switch (v) { case GENTLE -> DESCRIPTION_GENTLE; case STANDARD -> DESCRIPTION_STANDARD; case BUILD -> DESCRIPTION_BUILD; }; }

    /** Which version a stored plan is, from its description; null when the text was changed. */
    static Optional<Variant> variantOf(String description) {
        for (Variant v : Variant.values()) if (description(v).equals(description)) return Optional.of(v);
        return Optional.empty();
    }

    /** One tap on the client adds one set of `perSet`, so the target is all repetitions of all sets. */
    private static Line reps(String name, int sets, int perSet) { return new Line(name, sets * perSet, "rep", perSet); }

    private static Line hold(String name, int sets, int seconds) { return new Line(name, sets * seconds, "giây", seconds); }
}
