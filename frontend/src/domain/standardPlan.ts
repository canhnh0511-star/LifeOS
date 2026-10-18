import type { TrainingPlanDto, TrainingPlanLineDto, TrainingPlanSessionDto } from '../api/types';

/**
 * The standard gym plan, as the backend defines it (backend `plan/StandardPlan.java`). The mock API serves this copy;
 * `standardPlan.test.ts` checks that the two agree. Exercise names are the library's canonical English names.
 */
const reps = (title: string, sets: number, perSet: number): TrainingPlanLineDto => ({ title, target: sets * perSet, unit: 'rep', step: perSet });
const hold = (title: string, sets: number, seconds: number): TrainingPlanLineDto => ({ title, target: sets * seconds, unit: 'giây', step: seconds });

export const STANDARD_PLAN_TITLE = 'Gym — Tăng cơ · giảm mỡ toàn thân (3 buổi)';
export const STANDARD_PLAN_DESCRIPTION = 'Toàn thân 3 buổi (thứ 2, 4, 6), mỗi buổi 6 bài 3 set × 10–12 rep, nghỉ 60–90 giây, dừng khi còn đủ sức làm thêm 2 rep. '
  + 'Thứ 3 và thứ 7: cardio nhẹ 30–40 phút (đi bộ dốc, đạp xe). Chủ nhật nghỉ. Ăn thấp hơn mức duy trì khoảng 500 kcal, đủ đạm. '
  + 'Khi làm đủ 3 × 12 thoải mái thì tăng tạ 2,5–5%.';
export const STANDARD_PLAN_MINUTES = 55;
export const STANDARD_PLAN_XP = 50;

export const STANDARD_DAYS: readonly { title: string; weekdays: number[]; lines: TrainingPlanLineDto[] }[] = [
  { title: 'Buổi A — Toàn thân (đẩy, kéo, chân)', weekdays: [1], lines: [reps('Leg Press', 3, 12), reps('Machine Chest Press', 3, 10), reps('Lat Pulldown', 3, 10), reps('Dumbbell Shoulder Press', 3, 10), reps('Glute Bridge', 3, 12), hold('Plank', 3, 40)] },
  { title: 'Buổi B — Toàn thân (tạ đơn)', weekdays: [3], lines: [reps('Goblet Squat', 3, 10), reps('Push-up', 3, 10), reps('One-arm Dumbbell Row', 3, 10), reps('Dumbbell Romanian Deadlift', 3, 10), reps('Dumbbell Lateral Raise', 3, 12), reps('Bird Dog', 3, 10)] },
  { title: 'Buổi C — Toàn thân (kết hợp)', weekdays: [5], lines: [reps('Leg Press', 3, 12), reps('Push-up', 3, 10), reps('One-arm Dumbbell Row', 3, 10), reps('Dumbbell Shoulder Press', 3, 10), reps('Glute Bridge', 3, 12), hold('Plank', 3, 40)] }
];

/** The plan before it is started: what `GET /plan` returns for an account without one. */
export function standardPlanTemplate(): TrainingPlanDto {
  const sessions: TrainingPlanSessionDto[] = STANDARD_DAYS.map(d => ({ habitId: null, title: d.title, targetMinutes: STANDARD_PLAN_MINUTES, xpReward: STANDARD_PLAN_XP, weekdays: [...d.weekdays], objectives: d.lines.map(l => ({ ...l })) }));
  return { started: false, goalId: null, title: STANDARD_PLAN_TITLE, description: STANDARD_PLAN_DESCRIPTION, sessions };
}
