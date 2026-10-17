import { describe, expect, it } from 'vitest';
import type { HabitDto } from '../api/types';
import { hasGymHabit, nextGymSession, plannedLines } from './gymSession';

const habit = (id: string, title: string, weekdays: number[], objective: string | null, over: Partial<HabitDto> = {}): HabitDto => ({ id, goalId: 'g', title, targetMinutes: 45, xpReward: 40, weekdays: weekdays as HabitDto['weekdays'], startDate: '2026-10-19', endDate: null, status: 'ACTIVE', objectives: objective ? [{ id: 'o', title: objective, target: 20, unit: objective === 'Plank' ? 'giây' : 'rep', step: 10 }] : [], ...over });

describe('nextGymSession', () => {
  const plan = [habit('a', 'Buổi A', [1], 'Machine Chest Press'), habit('b', 'Buổi B', [3], 'Plank'), habit('w', 'Uống nước', [1, 2, 3, 4, 5, 6, 7], null)];
  it('skips non-gym habits and finds the next scheduled session after a rest day', () => {
    expect(nextGymSession(plan, '2026-10-17')).toEqual({ date: '2026-10-19', habit: plan[0] }); // Saturday -> Monday
    expect(nextGymSession(plan, '2026-10-20')?.habit.id).toBe('b'); // Tuesday -> Wednesday
  });
  it('includes today, ignores paused/archived and not-yet-started sessions, and gives up after the window', () => {
    expect(nextGymSession(plan, '2026-10-19')?.date).toBe('2026-10-19');
    expect(nextGymSession([habit('a', 'A', [1], 'Machine Chest Press', { status: 'PAUSED' })], '2026-10-19')).toBeNull();
    expect(nextGymSession([habit('a', 'A', [1], 'Plank', { startDate: '2026-12-01' })], '2026-10-19')).toBeNull();
    expect(nextGymSession([], '2026-10-19')).toBeNull();
  });
  it('knows whether any active gym habit exists', () => {
    expect(hasGymHabit(plan)).toBe(true); expect(hasGymHabit([plan[2]])).toBe(false); expect(hasGymHabit([habit('a', 'A', [1], 'Plank', { status: 'ARCHIVED' })])).toBe(false);
  });
});

describe('hand-made habits that merely share a name', () => {
  it('is not a gym session when the unit differs from the library (Plank in minutes)', () => {
    const demo = { id: 'd', goalId: 'g', title: 'Move your body', targetMinutes: 30, xpReward: 40, weekdays: [2, 4, 6], startDate: '2026-10-01', endDate: null, status: 'ACTIVE', objectives: [{ id: 'o', title: 'Plank', target: 3, unit: 'phút', step: 1 }] } as HabitDto;
    expect(hasGymHabit([demo])).toBe(false);
  });
});

describe('plannedLines', () => {
  const line = (title: string, target: number, step: number, unit = 'rep') => ({ title, unit, target, step });
  it('turns checklist lines into exercises with their sets and reps, skipping lines that are not library exercises', () => {
    const r = plannedLines([line('Leg Press', 30, 10), line('Piano', 20, 5), line('Plank', 135, 45, 'giây')]);
    expect(r.map(e => [e.name, e.sets, e.reps])).toEqual([['Leg Press', 3, 10], ['Plank', 3, 45]]);
  });
  it('falls back to the library sets when the target is not a multiple of the step', () => {
    expect(plannedLines([line('Leg Press', 25, 10)])[0].sets).toBe(3); // library default for Leg Press
  });
});
