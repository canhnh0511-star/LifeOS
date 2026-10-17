import { describe, expect, it } from 'vitest';
import type { WorkoutSetDto } from '../api/types';
import { exerciseById } from './exerciseLibrary';
import { sessionSummary } from './sessionSummary';

const set = (exercise: string, setNo: number, reps: number, weightKg: number | null): WorkoutSetDto => ({ exercise, setNo, reps, weightKg });
const plan = [{ ...exerciseById('machine-chest-press'), sets: 3, reps: 10 }, { ...exerciseById('seated-row'), sets: 2, reps: 10 }, { ...exerciseById('plank'), sets: 2, reps: 30 }];

describe('sessionSummary', () => {
  it('counts the exercises that have at least one set, all sets, and the volume of sets with a weight', () => {
    const s = sessionSummary(plan, [set('Machine Chest Press', 1, 10, 40), set('machine chest press', 2, 10, 40), set('Seated Cable Row', 1, 12, 30), set('Plank', 1, 30, null)], 0);
    expect(s).toEqual({ exercisesDone: 3, exercisesTotal: 3, setsDone: 4, setsPlanned: 7, volumeKg: 10 * 40 + 10 * 40 + 12 * 30, minutes: null });
  });
  it('does not count sets of exercises that are not part of the session', () => {
    const s = sessionSummary(plan, [set('Deadlift', 1, 5, 100), set('Seated Cable Row', 1, 10, 25)], 0);
    expect(s.setsDone).toBe(1); expect(s.exercisesDone).toBe(1); expect(s.volumeKg).toBe(250);
  });
  it('rounds the time up to whole minutes and says nothing when the stopwatch was never used', () => {
    expect(sessionSummary(plan, [], 0).minutes).toBeNull();
    expect(sessionSummary(plan, [], 90_000).minutes).toBe(2);
    expect(sessionSummary(plan, [], 2_700_000).minutes).toBe(45);
  });
  it('is all zeros for a session with nothing logged', () => {
    expect(sessionSummary(plan, [], 0)).toEqual({ exercisesDone: 0, exercisesTotal: 3, setsDone: 0, setsPlanned: 7, volumeKg: 0, minutes: null });
  });
});
