import { describe, expect, it, vi } from 'vitest';
import type { QuestDto, WorkoutSetDto } from '../api/types';
import { loadGymHistory } from './gymHistory';

const quest = (habitId: string, date: string, title: string, unit = 'rep'): QuestDto => ({ habitId, goalId: 'g', goalTitle: 'Gym', title: 'Buổi', targetMinutes: 45, xpReward: 50, category: 'HEALTH', date, status: 'COMPLETED', completedAt: null, objectives: [{ id: 'o', title, target: 10, unit, step: 1, value: 10 }] });
const set = (exercise: string, weightKg: number): WorkoutSetDto => ({ exercise, setNo: 1, reps: 10, weightKg });

describe('loadGymHistory', () => {
  it('returns one entry per day, oldest first, with the sets of gym sessions only', async () => {
    const quests: Record<string, QuestDto[]> = {
      '2026-10-18': [quest('a', '2026-10-18', 'Leg Press'), quest('p', '2026-10-18', 'Scales')],
      '2026-10-17': []
    };
    const api = { getQuests: vi.fn(async (d: string) => quests[d] ?? []), getWorkoutSets: vi.fn(async (h: string) => h === 'a' ? [set('Leg Press', 80)] : []) };
    const r = await loadGymHistory(api, '2026-10-18', 3);
    expect(r.map(d => d.date)).toEqual(['2026-10-16', '2026-10-17', '2026-10-18']);
    expect(r[2].sets).toEqual([set('Leg Press', 80)]);
    expect(api.getWorkoutSets).toHaveBeenCalledTimes(1); // Piano is not a gym session
    expect(api.getWorkoutSets).toHaveBeenCalledWith('a', '2026-10-18');
  });
  it('merges the sets of two gym sessions on the same day', async () => {
    const api = { getQuests: async () => [quest('a', 'd', 'Leg Press'), quest('b', 'd', 'Plank', 'giây')], getWorkoutSets: async (h: string) => [set(h === 'a' ? 'Leg Press' : 'Plank', 10)] };
    const [d] = await loadGymHistory(api, '2026-10-18', 1);
    expect(d.sets.map(x => x.exercise)).toEqual(['Leg Press', 'Plank']);
  });
});
