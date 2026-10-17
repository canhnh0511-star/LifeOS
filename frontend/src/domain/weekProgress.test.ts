import { describe, expect, it } from 'vitest';
import type { HabitDto } from '../api/types';
import { maxWeightTrends, plannedWeek, setsByGroup } from './weekProgress';

const s = (exercise: string, weightKg: number | null, reps = 10) => ({ exercise, setNo: 1, reps, weightKg });
const day = (date: string, ...sets: ReturnType<typeof s>[]) => ({ date, sets });
const habit = (id: string, weekdays: number[], lines: [string, number, number][], unit = 'rep'): HabitDto => ({ id, goalId: 'g', title: id, targetMinutes: 45, xpReward: 50, weekdays, startDate: '2026-10-01', endDate: null, status: 'ACTIVE',
  objectives: lines.map(([t, target, step], i) => ({ id: id + i, title: t, target, unit, step })) }) as HabitDto;

describe('plannedWeek', () => {
  const a = habit('a', [1, 3], [['Leg Press', 30, 10], ['Machine Chest Press', 20, 10]]);   // Mon + Wed: 3 sets legs, 2 chest
  it('counts the scheduled gym sessions of the week and the sets planned per muscle group', () => {
    const p = plannedWeek([a, habit('piano', [1, 2, 3], [['Scales', 10, 1]])], '2026-10-12');
    expect(p.sessions).toBe(2);
    expect(p.sets.get('LEGS')).toBe(6); expect(p.sets.get('CHEST')).toBe(4);
  });
  it('ignores archived sessions and days before the habit started', () => {
    expect(plannedWeek([{ ...a, status: 'ARCHIVED' }], '2026-10-12').sessions).toBe(0);
    expect(plannedWeek([{ ...a, startDate: '2026-10-14' }], '2026-10-12').sessions).toBe(1);
  });
});

describe('setsByGroup', () => {
  it('counts the sets logged inside the week per muscle group', () => {
    const m = setsByGroup([day('2026-10-11', s('Leg Press', 80)), day('2026-10-12', s('Leg Press', 80), s('Leg Press', 80), s('Plank', null, 30)), day('2026-10-19', s('Leg Press', 80))], '2026-10-12');
    expect(m.get('LEGS')).toBe(2); expect(m.get('CORE')).toBe(1);
  });
});

describe('maxWeightTrends', () => {
  const days = [1, 2, 3, 4, 5, 6].map(i => day(`2026-10-0${i}`, s('Leg Press', 60 + i * 5), s('Leg Press', 50))).concat([day('2026-10-07', s('Plank', null, 30))]);
  it('gives the heaviest weight of each of the last 5 sessions, the latest and the gain over the first shown', () => {
    const [t] = maxWeightTrends(days, 5);
    expect(t.exercise).toBe('Leg Press'); expect(t.points).toEqual([70, 75, 80, 85, 90]); expect(t.latest).toBe(90); expect(t.delta).toBe(20);
  });
  it('skips exercises without weights', () => { expect(maxWeightTrends(days, 5).map(t => t.exercise)).toEqual(['Leg Press']); });
  it('ranks by number of sessions then by most recent, and keeps the top N', () => {
    const more = [...days, day('2026-10-08', s('Machine Chest Press', 30)), day('2026-10-09', s('Machine Chest Press', 32))];
    expect(maxWeightTrends(more, 5, 1).map(t => t.exercise)).toEqual(['Leg Press']);
    expect(maxWeightTrends(more, 5).map(t => t.exercise)).toEqual(['Leg Press', 'Machine Chest Press']);
  });
});
