import type { TrainingPlanDto, TrainingPlanLineDto, TrainingPlanSessionDto } from '../api/types';

/**
 * The standard gym plan, as the backend defines it (backend `plan/StandardPlan.java`). The mock API serves this copy;
 * `standardPlan.test.ts` checks that the two agree. Exercise names are the library's canonical English names.
 */
const reps = (title: string, sets: number, perSet: number): TrainingPlanLineDto => ({ title, target: sets * perSet, unit: 'rep', step: perSet });
const hold = (title: string, sets: number, seconds: number): TrainingPlanLineDto => ({ title, target: sets * seconds, unit: 'giây', step: seconds });

export const STANDARD_PLAN_TITLE = 'Gym — Tăng cơ · giảm mỡ toàn thân (3 buổi)';
export const STANDARD_PLAN_DESCRIPTION =
  'Dành cho người mới, mục tiêu giảm mỡ và săn chắc trong 100 ngày (14 tuần). '
  + 'Toàn thân 3 buổi (thứ 2, 4, 6), mỗi buổi 6 bài 3 set, nghỉ 60–90 giây, dừng khi còn dư 2–3 rep. '
  + 'Chọn máy và tạ đơn, không nhảy và không chống đẩy sàn để nhẹ khớp gối, cổ chân. '
  + 'Tuần 1–4 làm quen với tạ nhẹ, tuần 5–10 tăng tạ 2,5–5% khi đủ số rep ở mọi set, tuần 11–14 giảm nghỉ còn 45–60 giây. '
  + 'Thứ 3 và thứ 7: đi bộ nhanh hoặc dốc nhẹ 30–40 phút; thứ 5 và chủ nhật nghỉ. '
  + 'Ăn thấp hơn mức duy trì khoảng 400–500 kcal, đạm 1,6–2 g/kg cân nặng mục tiêu, ngủ 7–8 giờ; giảm hợp lý 0,5–0,8 kg mỗi tuần.';
export const STANDARD_PLAN_MINUTES = 55;
export const STANDARD_PLAN_XP = 50;

export const STANDARD_DAYS: readonly { title: string; weekdays: number[]; lines: TrainingPlanLineDto[] }[] = [
  { title: 'Buổi A — Toàn thân (đẩy, kéo, chân)', weekdays: [1], lines: [reps('Leg Press', 3, 12), reps('Machine Chest Press', 3, 10), reps('Lat Pulldown', 3, 10), reps('Dumbbell Shoulder Press', 3, 10), reps('Glute Bridge', 3, 12), hold('Plank', 3, 30)] },
  { title: 'Buổi B — Toàn thân (tạ đơn)', weekdays: [3], lines: [reps('Goblet Squat', 3, 10), reps('Machine Chest Press', 3, 12), reps('One-arm Dumbbell Row', 3, 10), reps('Dumbbell Romanian Deadlift', 3, 10), reps('Dumbbell Lateral Raise', 3, 12), reps('Bird Dog', 3, 10)] },
  { title: 'Buổi C — Toàn thân (chân, lưng, vai)', weekdays: [5], lines: [reps('Leg Press', 3, 12), reps('Lat Pulldown', 3, 12), reps('Dumbbell Shoulder Press', 3, 10), reps('Dumbbell Romanian Deadlift', 3, 10), reps('Glute Bridge', 3, 15), hold('Plank', 3, 30)] }
];

/** The plan before it is started: what `GET /plan` returns for an account without one. */
export function standardPlanTemplate(): TrainingPlanDto {
  const sessions: TrainingPlanSessionDto[] = STANDARD_DAYS.map(d => ({ habitId: null, title: d.title, targetMinutes: STANDARD_PLAN_MINUTES, xpReward: STANDARD_PLAN_XP, weekdays: [...d.weekdays], objectives: d.lines.map(l => ({ ...l })) }));
  return { started: false, goalId: null, title: STANDARD_PLAN_TITLE, description: STANDARD_PLAN_DESCRIPTION, sessions };
}
