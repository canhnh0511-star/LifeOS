import { describe, expect, it } from 'vitest';
import { summarizeWorkouts } from './workoutStats';

const s = (exercise: string, setNo: number, reps: number, weightKg: number | null) => ({ exercise, setNo, reps, weightKg });
describe('summarizeWorkouts (B-41)', () => {
  it('counts sessions, sets, reps and volume (weight × reps), and ignores hold seconds as reps', () => {
    const r = summarizeWorkouts([
      { date: '2026-10-19', sets: [s('Machine Chest Press', 1, 10, 40), s('Machine Chest Press', 2, 8, 42.5), s('Plank', 1, 45, null)] },
      { date: '2026-10-20', sets: [] },
      { date: '2026-10-21', sets: [s('Leg Press', 1, 12, 80)] }
    ]);
    expect(r.sessions).toBe(2); expect(r.totalSets).toBe(4); expect(r.totalReps).toBe(30);
    expect(r.volumeKg).toBe(400 + 340 + 960);
    expect(r.perDay).toEqual([{ date: '2026-10-19', sets: 3 }, { date: '2026-10-20', sets: 0 }, { date: '2026-10-21', sets: 1 }]);
  });
  it('shares sets by muscle group (summing to 1) and ranks exercises by volume', () => {
    const r = summarizeWorkouts([{ date: 'd', sets: [s('Machine Chest Press', 1, 10, 40), s('Machine Chest Press', 2, 10, 40), s('Leg Press', 1, 10, 100), s('Plank', 1, 30, null)] }]);
    expect(r.byGroup.map(g => g.group)).toEqual(['CHEST', 'LEGS', 'CORE']);
    expect(r.byGroup.reduce((a, g) => a + g.share, 0)).toBeCloseTo(1);
    expect(r.byGroup[0].share).toBeCloseTo(0.5);
    expect(r.topExercises[0]).toEqual({ name: 'Leg Press', sets: 1, volumeKg: 1000 });
  });
  it('is all zeros with no sets', () => {
    expect(summarizeWorkouts([])).toEqual({ sessions: 0, totalSets: 0, totalReps: 0, volumeKg: 0, perDay: [], byGroup: [], topExercises: [] });
  });
});
