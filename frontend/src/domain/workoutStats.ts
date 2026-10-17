import type { WorkoutSetDto } from '../api/types';
import { exerciseByName, type MuscleGroup } from './exerciseLibrary';

/** Sets logged on one day (B-41). Stats are computed on the client from the set log; they never touch XP. */
export interface DaySets { date: string; sets: WorkoutSetDto[]; }
export interface WorkoutSummary {
  sessions: number; totalSets: number; totalReps: number; volumeKg: number;
  perDay: { date: string; sets: number }[];
  byGroup: { group: MuscleGroup; sets: number; share: number }[];
  topExercises: { name: string; sets: number; volumeKg: number }[];
}

export function summarizeWorkouts(days: readonly DaySets[]): WorkoutSummary {
  const groups = new Map<MuscleGroup, number>(), byExercise = new Map<string, { sets: number; volumeKg: number }>();
  let totalSets = 0, totalReps = 0, volumeKg = 0, sessions = 0;
  for (const d of days) {
    if (d.sets.length) sessions++;
    for (const s of d.sets) {
      totalSets++;
      const e = exerciseByName(s.exercise), isHold = e?.unit === 'giây';
      if (!isHold) totalReps += s.reps;
      const vol = !isHold && s.weightKg ? s.reps * s.weightKg : 0;
      volumeKg += vol;
      if (e) groups.set(e.group, (groups.get(e.group) ?? 0) + 1);
      const cur = byExercise.get(s.exercise) ?? { sets: 0, volumeKg: 0 };
      byExercise.set(s.exercise, { sets: cur.sets + 1, volumeKg: cur.volumeKg + vol });
    }
  }
  const counted = [...groups.values()].reduce((a, b) => a + b, 0);
  return {
    sessions, totalSets, totalReps, volumeKg: Math.round(volumeKg * 10) / 10,
    perDay: days.map(d => ({ date: d.date, sets: d.sets.length })),
    byGroup: [...groups].map(([group, sets]) => ({ group, sets, share: counted ? sets / counted : 0 })).sort((a, b) => b.sets - a.sets),
    topExercises: [...byExercise].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.volumeKg - a.volumeKg || b.sets - a.sets).slice(0, 5)
  };
}
