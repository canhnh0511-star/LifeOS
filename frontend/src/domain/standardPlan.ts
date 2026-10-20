import type { BodyGoalDto, PlanVariant, TrainingPlanDto, TrainingPlanLineDto, TrainingPlanSessionDto } from '../api/types';
import { bmi } from './bodyGoal';

/**
 * The standard gym plan in its three versions, as the backend defines them (backend `plan/StandardPlan.java`, ADR-044). The mock API serves this
 * copy; `standardPlan.test.ts` checks that the two agree. Exercise names are the library's canonical English names.
 */
const reps = (title: string, sets: number, perSet: number): TrainingPlanLineDto => ({ title, target: sets * perSet, unit: 'rep', step: perSet });
const hold = (title: string, sets: number, seconds: number): TrainingPlanLineDto => ({ title, target: sets * seconds, unit: 'giây', step: seconds });

/** Every version has this title: it is how an account's plan is found and recognised. */
export const STANDARD_PLAN_TITLE = 'Gym — Tăng cơ · giảm mỡ toàn thân (3 buổi)';
export const STANDARD_PLAN_MINUTES = 55;
export const STANDARD_PLAN_XP = 50;

export const VARIANTS: readonly PlanVariant[] = ['GENTLE', 'STANDARD', 'BUILD'];
export const VARIANT_LABEL: Record<PlanVariant, string> = { GENTLE: 'Giảm cân, nhẹ khớp', STANDARD: 'Giảm mỡ', BUILD: 'Tăng cân, tăng cơ' };
export const VARIANT_WHY: Record<PlanVariant, string> = {
  GENTLE: 'Mục tiêu giảm cân với BMI từ 30: bài nhẹ khớp, không nhảy, không chống đẩy sàn.',
  STANDARD: 'Mục tiêu giảm cân với BMI dưới 30: có chống đẩy sàn và plank 40 giây.',
  BUILD: 'Mục tiêu tăng cân: bài lớn 4 set, nghỉ lâu hơn, ăn thừa nhẹ.'
};

export const STANDARD_DESCRIPTION: Record<PlanVariant, string> = {
  GENTLE: 'Dành cho người mới, mục tiêu giảm mỡ và săn chắc trong 100 ngày (14 tuần). '
    + 'Toàn thân 3 buổi (thứ 2, 4, 6), mỗi buổi 6 bài 3 set, nghỉ 60–90 giây, dừng khi còn dư 2–3 rep. '
    + 'Chọn máy và tạ đơn, không nhảy và không chống đẩy sàn để nhẹ khớp gối, cổ chân. '
    + 'Tuần 1–4 làm quen với tạ nhẹ, tuần 5–10 tăng tạ 2,5–5% khi đủ số rep ở mọi set, tuần 11–14 giảm nghỉ còn 45–60 giây. '
    + 'Thứ 3 và thứ 7: đi bộ nhanh hoặc dốc nhẹ 30–40 phút; thứ 5 và chủ nhật nghỉ. '
    + 'Ăn thấp hơn mức duy trì khoảng 400–500 kcal, đạm 1,6–2 g/kg cân nặng mục tiêu, ngủ 7–8 giờ; giảm hợp lý 0,5–0,8 kg mỗi tuần.',
  STANDARD: 'Dành cho người mới, mục tiêu giảm mỡ trong thời gian bạn đặt. '
    + 'Toàn thân 3 buổi (thứ 2, 4, 6), mỗi buổi 6 bài 3 set, nghỉ 60–90 giây, dừng khi còn dư 2 rep. '
    + 'Tuần đầu dùng tạ nhẹ để học động tác, sau đó tăng tạ 2,5–5% khi làm đủ số rep ở mọi set. '
    + 'Thứ 3 và thứ 7: đi bộ nhanh hoặc đạp xe 30–40 phút; thứ 5 và chủ nhật nghỉ. '
    + 'Ăn thấp hơn mức duy trì khoảng 400–500 kcal, đạm 1,6–2 g/kg, ngủ 7–8 giờ; giảm hợp lý 0,5–1 kg mỗi tuần.',
  BUILD: 'Dành cho người muốn tăng cân và tăng cơ. '
    + 'Toàn thân 3 buổi (thứ 2, 4, 6), bài lớn 4 set × 8–10 rep, nghỉ 90–120 giây, dừng khi còn dư 1–2 rep. '
    + 'Tăng tạ 2,5–5% khi đủ rep ở mọi set, tăng đều mỗi tuần. '
    + 'Thứ 3 và thứ 7: đi bộ nhẹ 20–30 phút; thứ 5 và chủ nhật nghỉ. '
    + 'Ăn thừa khoảng 250–300 kcal, đạm 1,6–2,2 g/kg, ngủ 7–9 giờ; tăng hợp lý 0,25–0,5 kg mỗi tuần.'
};

type Day = { title: string; weekdays: number[]; lines: TrainingPlanLineDto[] };
export const STANDARD_DAYS_BY_VARIANT: Record<PlanVariant, readonly Day[]> = {
  GENTLE: [
    { title: 'Buổi A — Toàn thân (đẩy, kéo, chân)', weekdays: [1], lines: [reps('Leg Press', 3, 12), reps('Machine Chest Press', 3, 10), reps('Lat Pulldown', 3, 10), reps('Dumbbell Shoulder Press', 3, 10), reps('Glute Bridge', 3, 12), hold('Plank', 3, 30)] },
    { title: 'Buổi B — Toàn thân (tạ đơn)', weekdays: [3], lines: [reps('Goblet Squat', 3, 10), reps('Machine Chest Press', 3, 12), reps('One-arm Dumbbell Row', 3, 10), reps('Dumbbell Romanian Deadlift', 3, 10), reps('Dumbbell Lateral Raise', 3, 12), reps('Bird Dog', 3, 10)] },
    { title: 'Buổi C — Toàn thân (chân, lưng, vai)', weekdays: [5], lines: [reps('Leg Press', 3, 12), reps('Lat Pulldown', 3, 12), reps('Dumbbell Shoulder Press', 3, 10), reps('Dumbbell Romanian Deadlift', 3, 10), reps('Glute Bridge', 3, 15), hold('Plank', 3, 30)] }
  ],
  STANDARD: [
    { title: 'Buổi A — Toàn thân (đẩy, kéo, chân)', weekdays: [1], lines: [reps('Leg Press', 3, 12), reps('Machine Chest Press', 3, 10), reps('Lat Pulldown', 3, 10), reps('Dumbbell Shoulder Press', 3, 10), reps('Glute Bridge', 3, 12), hold('Plank', 3, 40)] },
    { title: 'Buổi B — Toàn thân (tạ đơn)', weekdays: [3], lines: [reps('Goblet Squat', 3, 10), reps('Push-up', 3, 10), reps('One-arm Dumbbell Row', 3, 10), reps('Dumbbell Romanian Deadlift', 3, 10), reps('Dumbbell Lateral Raise', 3, 12), reps('Bird Dog', 3, 10)] },
    { title: 'Buổi C — Toàn thân (kết hợp)', weekdays: [5], lines: [reps('Leg Press', 3, 12), reps('Push-up', 3, 10), reps('One-arm Dumbbell Row', 3, 10), reps('Dumbbell Shoulder Press', 3, 10), reps('Dumbbell Romanian Deadlift', 3, 10), hold('Plank', 3, 40)] }
  ],
  BUILD: [
    { title: 'Buổi A — Toàn thân (chân, ngực, lưng)', weekdays: [1], lines: [reps('Leg Press', 4, 10), reps('Machine Chest Press', 4, 8), reps('Lat Pulldown', 4, 8), reps('Dumbbell Shoulder Press', 3, 10), reps('Glute Bridge', 3, 12), hold('Plank', 3, 40)] },
    { title: 'Buổi B — Toàn thân (tạ đơn)', weekdays: [3], lines: [reps('Goblet Squat', 4, 10), reps('Push-up', 3, 10), reps('One-arm Dumbbell Row', 4, 8), reps('Dumbbell Romanian Deadlift', 4, 8), reps('Dumbbell Lateral Raise', 3, 12), reps('Bird Dog', 3, 10)] },
    { title: 'Buổi C — Toàn thân (nặng)', weekdays: [5], lines: [reps('Leg Press', 4, 10), reps('Machine Chest Press', 4, 8), reps('Lat Pulldown', 4, 8), reps('Dumbbell Shoulder Press', 3, 10), reps('Dumbbell Romanian Deadlift', 3, 10), hold('Plank', 3, 40)] }
  ]
};

/**
 * The light days between the gym sessions (ADR-045; backend `StandardPlan.RECOVERY_*`): a brisk walk on Tuesday and Saturday, stretching on Thursday.
 * Sunday has no task, it is a real rest day. These are plain checklists (not library exercises), so they have no set-by-set screen.
 */
export const WALK_XP = 20, STRETCH_XP = 10, STRETCH_TITLE = 'Giãn cơ phục hồi';
type Recovery = Day & { targetMinutes: number; xpReward: number };
const mins = (title: string, minutes: number): TrainingPlanLineDto => ({ title, target: minutes, unit: 'phút', step: 5 });
const recovery = (walkTitle: string, walkMinutes: number, mainLine: string, mainMinutes: number): readonly Recovery[] => [
  { title: walkTitle, weekdays: [2, 6], targetMinutes: walkMinutes, xpReward: WALK_XP, lines: [mins('Khởi động: đi bộ chậm', 5), mins(mainLine, mainMinutes), mins('Thả lỏng: đi bộ chậm', 5)] },
  { title: STRETCH_TITLE, weekdays: [4], targetMinutes: 10, xpReward: STRETCH_XP, lines: ['Giãn đùi trước', 'Giãn đùi sau', 'Mở hông', 'Giãn ngực và vai', 'Giãn lưng dưới'].map(t => hold(t, 2, 30)) }
];
export const RECOVERY_DAYS_BY_VARIANT: Record<PlanVariant, readonly Recovery[]> = {
  GENTLE: recovery('Đi bộ nhanh', 35, 'Đi bộ nhanh hoặc dốc nhẹ', 25),
  STANDARD: recovery('Đi bộ nhanh', 35, 'Đi bộ nhanh hoặc đạp xe', 25),
  BUILD: recovery('Đi bộ nhẹ', 25, 'Đi bộ nhẹ', 15)
};
const RECOVERY_TITLES = new Set(VARIANTS.flatMap(v => RECOVERY_DAYS_BY_VARIANT[v].map(d => d.title.toLowerCase())));
/** Whether a habit title is one of the recovery sessions (how an account's plan is told to already have them). */
export const isRecoveryTitle = (title: string) => RECOVERY_TITLES.has(title.trim().toLowerCase());
export const hasRecoveryHabit = (habits: readonly { title: string; status: string }[]) => habits.some(h => h.status === 'ACTIVE' && isRecoveryTitle(h.title));

/** The version a body goal calls for: gaining weight is BUILD, losing weight is GENTLE from a BMI of 30 and STANDARD below it; no goal is GENTLE. */
export function variantFor(goal: Pick<BodyGoalDto, 'heightCm' | 'startWeightKg' | 'targetWeightKg'> | null | undefined): PlanVariant {
  if (!goal) return 'GENTLE';
  if (goal.targetWeightKg > goal.startWeightKg) return 'BUILD';
  return bmi(goal.startWeightKg, goal.heightCm) >= 30 ? 'GENTLE' : 'STANDARD';
}

/** Which version a stored plan is, from its description; null when the text was changed. */
export const variantOfDescription = (description: string): PlanVariant | null => VARIANTS.find(v => STANDARD_DESCRIPTION[v] === description) ?? null;

/** The plan before it is started: what `GET /plan` returns for an account without one. */
export function standardPlanTemplate(variant: PlanVariant = 'GENTLE'): TrainingPlanDto {
  const gym: TrainingPlanSessionDto[] = STANDARD_DAYS_BY_VARIANT[variant].map(d => ({ habitId: null, title: d.title, targetMinutes: STANDARD_PLAN_MINUTES, xpReward: STANDARD_PLAN_XP, weekdays: [...d.weekdays], objectives: d.lines.map(l => ({ ...l })) }));
  const light: TrainingPlanSessionDto[] = RECOVERY_DAYS_BY_VARIANT[variant].map(d => ({ habitId: null, title: d.title, targetMinutes: d.targetMinutes, xpReward: d.xpReward, weekdays: [...d.weekdays], objectives: d.lines.map(l => ({ ...l })) }));
  const sessions = [...gym, ...light].sort((a, b) => a.weekdays[0]! - b.weekdays[0]! || a.title.localeCompare(b.title));
  return { started: false, goalId: null, title: STANDARD_PLAN_TITLE, description: STANDARD_DESCRIPTION[variant], sessions, variant, suggestedVariant: variant };
}
