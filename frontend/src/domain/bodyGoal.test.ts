import { describe, expect, it } from 'vitest';
import type { BodyGoalDto, MetricDto } from '../api/types';
import { bmi, bmiClass, goalProgress, latestWeight, validateGoalInput } from './bodyGoal';

const goal: BodyGoalDto = { heightCm: 166, startWeightKg: 86, targetWeightKg: 78.5, startDate: '2026-10-19', days: 100 };
const weight = (...entries: [string, number][]): MetricDto[] => [{ id: 'w', name: 'Cân nặng', unit: 'kg', builtin: true, entries: entries.map(([date, value]) => ({ date, value })) }];

describe('BMI', () => {
  it('86 kg at 1,66 m is 31,2: obese class by WHO; the target 78,5 kg is 28,5: overweight', () => {
    expect(bmi(86, 166)).toBe(31.2); expect(bmiClass(31.2)).toBe('Béo phì');
    expect(bmi(78.5, 166)).toBe(28.5); expect(bmiClass(28.5)).toBe('Thừa cân');
    expect(bmiClass(18.4)).toBe('Thiếu cân'); expect(bmiClass(22)).toBe('Bình thường');
  });
});

describe('goal progress', () => {
  it('counts the day from 1, shows days left and the steady-pace weight', () => {
    const p = goalProgress(goal, weight(['2026-10-19', 86]), '2026-10-19');
    expect([p.day, p.daysLeft, p.expectedKg, p.finished]).toEqual([1, 99, 86, false]);
    const mid = goalProgress(goal, weight(['2026-10-19', 86]), '2026-12-08'); // 50 days later
    expect([mid.day, mid.expectedKg]).toEqual([51, 82.3]); // 86 - 7.5 * 50 / 100 = 82.25
  });
  it('before the start date nothing is due; after the last day it is finished and the day stops at the total', () => {
    expect(goalProgress(goal, [], '2026-10-18')).toMatchObject({ day: 0, pace: 'NOT_STARTED', finished: false });
    expect(goalProgress(goal, weight(['2027-01-20', 80]), '2027-02-10')).toMatchObject({ day: 100, daysLeft: 0, finished: true });
  });
  it('uses the latest weight on or before today and ignores weights from before the goal started', () => {
    expect(latestWeight(weight(['2026-10-01', 90], ['2026-10-25', 85], ['2026-11-30', 80]), '2026-11-01')).toEqual({ date: '2026-10-25', value: 85 });
    expect(goalProgress(goal, weight(['2026-10-10', 90]), '2026-10-25').pace).toBe('NO_DATA');
    expect(latestWeight([], '2026-10-25')).toBeNull();
  });
  it('measures how far along the way the weight is, between 0 and 1', () => {
    const p = goalProgress(goal, weight(['2026-10-19', 86], ['2026-11-20', 82]), '2026-11-20');
    expect([p.changedKg, p.toGoKg]).toEqual([-4, 3.5]); expect(p.fraction).toBeCloseTo(0.533, 2);
    expect(goalProgress(goal, weight(['2026-10-20', 90]), '2026-10-25').fraction).toBe(0); // heavier than the start: no progress, never negative
    expect(goalProgress(goal, weight(['2026-12-01', 70]), '2026-12-01').fraction).toBe(1);  // past the target: capped
  });
  it('compares with the steady pace: on track within 0,8 kg, ahead or behind beyond it', () => {
    // On day 31 (30 days in) the steady weight is 86 - 7.5 * 0.3 = 83.75.
    const at = (kg: number) => goalProgress(goal, weight(['2026-11-18', kg]), '2026-11-18').pace;
    expect(at(83.5)).toBe('ON_TRACK'); expect(at(84.4)).toBe('ON_TRACK');
    expect(at(82.5)).toBe('AHEAD'); expect(at(85)).toBe('BEHIND');
  });
  it('gives the weekly change only after a full week, negative when losing', () => {
    expect(goalProgress(goal, weight(['2026-10-24', 85]), '2026-10-24').weeklyKg).toBeNull();
    expect(goalProgress(goal, weight(['2026-11-02', 84]), '2026-11-02').weeklyKg).toBe(-1); // -2 kg over 14 days = 2 weeks
  });
  it('warns about a target that is too low or too fast, and about losing more than 1 % a week', () => {
    expect(goalProgress({ ...goal, targetWeightKg: 50 }, [], '2026-10-19').warnings.join(' ')).toMatch(/thiếu cân/);
    expect(goalProgress({ ...goal, targetWeightKg: 70, days: 56 }, [], '2026-10-19').warnings.join(' ')).toMatch(/hơn 1% cân nặng mỗi tuần, khá nhanh/);
    expect(goalProgress(goal, weight(['2026-10-26', 84]), '2026-10-26').warnings.join(' ')).toMatch(/Bạn đang giảm hơn 1%/); // 2 kg in a week = 2.3 %
    expect(goalProgress(goal, weight(['2026-10-26', 85.4]), '2026-10-26').warnings).toEqual([]);
  });
  it('works for a gain goal too: the direction flips', () => {
    const gain: BodyGoalDto = { ...goal, startWeightKg: 60, targetWeightKg: 66 };
    expect(goalProgress(gain, weight(['2026-11-18', 62.5]), '2026-11-18')).toMatchObject({ expectedKg: 61.8, pace: 'ON_TRACK', changedKg: 2.5 });
  });
});

describe('goal form validation', () => {
  const ok = { heightCm: 166, startWeightKg: 86, targetWeightKg: 78.5, days: 100 };
  it('accepts the plan values and explains each wrong field', () => {
    expect(validateGoalInput(ok)).toEqual({});
    expect(Object.keys(validateGoalInput({ heightCm: 90, startWeightKg: 10, targetWeightKg: 400, days: 7 })).sort()).toEqual(['days', 'heightCm', 'startWeightKg', 'targetWeightKg']);
    expect(validateGoalInput({ ...ok, targetWeightKg: 86 }).targetWeightKg).toMatch(/khác/);
  });
});
