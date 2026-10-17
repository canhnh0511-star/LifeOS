import type { WorkoutSetDto } from '../api/types';
import type { Exercise } from './exerciseLibrary';

/** What a finished session adds up to, from the exercises it planned and the sets logged for it. Read-only; nothing here gives XP. */
export interface SessionSummary { exercisesDone: number; exercisesTotal: number; setsDone: number; setsPlanned: number; /** sum of reps x kg over sets with a weight */ volumeKg: number; /** whole minutes from the session stopwatch, null when it was not used */ minutes: number | null; }

export function sessionSummary(exercises: readonly Exercise[], sets: readonly WorkoutSetDto[], elapsedMs: number): SessionSummary {
  const names = new Set(exercises.map(e => e.name.toLowerCase()));
  const mine = sets.filter(s => names.has(s.exercise.toLowerCase()));
  const done = new Set(mine.map(s => s.exercise.toLowerCase()));
  return {
    exercisesDone: exercises.filter(e => done.has(e.name.toLowerCase())).length, exercisesTotal: exercises.length,
    setsDone: mine.length, setsPlanned: exercises.reduce((sum, e) => sum + e.sets, 0),
    volumeKg: mine.reduce((sum, s) => sum + (s.weightKg && s.weightKg > 0 ? s.reps * s.weightKg : 0), 0),
    minutes: elapsedMs > 0 ? Math.ceil(elapsedMs / 60000) : null
  };
}
