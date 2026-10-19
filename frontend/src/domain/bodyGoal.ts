import type { BodyGoalDto, MetricDto } from '../api/types';
import { diffDays } from './rules';

/**
 * Progress towards a body goal (e.g. 86 kg to 78,5 kg in 100 days), computed from the weight the user already records.
 * Tracking only: it gives no XP and never changes a plan. The ranges are general guidance (WHO BMI classes, 0,5-1 % of body weight per week
 * as a sustainable loss) and are not medical advice.
 */
export const WEIGHT_METRIC_NAME = 'Cân nặng';

const round1 = (n: number) => Math.round(n * 10) / 10;
export const bmi = (weightKg: number, heightCm: number) => round1(weightKg / ((heightCm / 100) ** 2));
export function bmiClass(value: number): string { return value < 18.5 ? 'Thiếu cân' : value < 25 ? 'Bình thường' : value < 30 ? 'Thừa cân' : 'Béo phì'; }

/** The latest weight on or before `today`, from the weight metric. */
export function latestWeight(metrics: readonly MetricDto[], today: string): { date: string; value: number } | null {
  const weight = metrics.find(m => m.builtin && m.name === WEIGHT_METRIC_NAME);
  const e = weight?.entries.filter(x => x.date <= today).at(-1);
  return e ? { date: e.date, value: e.value } : null;
}

export type Pace = 'NOT_STARTED' | 'NO_DATA' | 'AHEAD' | 'ON_TRACK' | 'BEHIND';
export interface GoalProgress {
  /** 1-based day of the goal, 0 before it starts, never more than `days` */ day: number; daysLeft: number; finished: boolean;
  currentKg: number | null; changedKg: number | null; toGoKg: number | null;
  /** 0 to 1, how much of the way from start to target the current weight is */ fraction: number;
  /** the weight a steady pace would have by today */ expectedKg: number;
  pace: Pace; /** kg gained or lost per week so far (negative when losing), null before a week has passed */ weeklyKg: number | null;
  bmiStart: number; bmiNow: number | null; bmiTarget: number;
  warnings: string[];
}

const TOLERANCE_KG = 0.8;
export function goalProgress(goal: BodyGoalDto, metrics: readonly MetricDto[], today: string): GoalProgress {
  const elapsed = diffDays(goal.startDate, today);   // 0 on the first day
  const day = elapsed < 0 ? 0 : Math.min(goal.days, elapsed + 1);
  const losing = goal.targetWeightKg < goal.startWeightKg;
  const share = Math.min(1, Math.max(0, elapsed / goal.days));
  const expectedKg = round1(goal.startWeightKg + (goal.targetWeightKg - goal.startWeightKg) * share);
  const now = latestWeight(metrics, today);
  const currentKg = now && now.date >= goal.startDate ? now.value : null;
  const changedKg = currentKg === null ? null : round1(currentKg - goal.startWeightKg);
  const fraction = currentKg === null ? 0 : Math.min(1, Math.max(0, (goal.startWeightKg - currentKg) / (goal.startWeightKg - goal.targetWeightKg)));
  const weeks = Math.max(0, elapsed) / 7;
  const weeklyKg = currentKg === null || weeks < 1 ? null : round1((currentKg - goal.startWeightKg) / weeks);
  // Ahead / behind compares today's weight with the steady pace, in the direction of the goal.
  const gap = currentKg === null ? 0 : (losing ? expectedKg - currentKg : currentKg - expectedKg);
  const pace: Pace = elapsed < 0 ? 'NOT_STARTED' : currentKg === null ? 'NO_DATA' : gap > TOLERANCE_KG ? 'AHEAD' : gap < -TOLERANCE_KG ? 'BEHIND' : 'ON_TRACK';
  const bmiTarget = bmi(goal.targetWeightKg, goal.heightCm);
  const warnings: string[] = [];
  if (bmiTarget < 18.5) warnings.push('Cân nặng mục tiêu ứng với BMI dưới 18,5 (thiếu cân). Hãy chọn mục tiêu cao hơn.');
  const weeklyTarget = Math.abs(goal.targetWeightKg - goal.startWeightKg) / (goal.days / 7);
  if (losing && weeklyTarget > goal.startWeightKg * 0.01) warnings.push('Mục tiêu giảm hơn 1% cân nặng mỗi tuần, khá nhanh. Mức bền vững thường là 0,5–1%.');
  if (losing && weeklyKg !== null && -weeklyKg > goal.startWeightKg * 0.01) warnings.push('Bạn đang giảm hơn 1% cân nặng mỗi tuần. Giảm quá nhanh dễ mất cơ và khó duy trì: ăn đủ đạm, nghỉ ngơi.');
  return { day, daysLeft: Math.max(0, goal.days - Math.max(0, elapsed + 1)), finished: elapsed >= goal.days, currentKg, changedKg, toGoKg: currentKg === null ? null : round1(Math.abs(currentKg - goal.targetWeightKg)), fraction, expectedKg, pace, weeklyKg, bmiStart: bmi(goal.startWeightKg, goal.heightCm), bmiNow: currentKg === null ? null : bmi(currentKg, goal.heightCm), bmiTarget, warnings };
}

export const paceLabel: Record<Pace, string> = { NOT_STARTED: 'Chưa bắt đầu', NO_DATA: 'Chưa có cân nặng mới', AHEAD: 'Nhanh hơn kế hoạch', ON_TRACK: 'Đúng tiến độ', BEHIND: 'Chậm hơn kế hoạch' };

/** Checks the goal form; returns the first message per field. */
export function validateGoalInput(i: { heightCm: number; startWeightKg: number; targetWeightKg: number; days: number }): Record<string, string> {
  const e: Record<string, string> = {};
  if (!Number.isInteger(i.heightCm) || i.heightCm < 100 || i.heightCm > 250) e.heightCm = 'Chiều cao từ 100 đến 250 cm.';
  if (!(i.startWeightKg >= 20 && i.startWeightKg <= 300)) e.startWeightKg = 'Cân nặng từ 20 đến 300 kg.';
  if (!(i.targetWeightKg >= 20 && i.targetWeightKg <= 300)) e.targetWeightKg = 'Cân nặng từ 20 đến 300 kg.';
  else if (i.targetWeightKg === i.startWeightKg) e.targetWeightKg = 'Mục tiêu phải khác cân nặng hiện tại.';
  if (!Number.isInteger(i.days) || i.days < 14 || i.days > 366) e.days = 'Số ngày từ 14 đến 366.';
  return e;
}
