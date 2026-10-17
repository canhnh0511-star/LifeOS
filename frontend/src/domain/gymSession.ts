import type { HabitDto } from '../api/types';
import { exerciseByName, isGymHabit, isLibraryLine, type Exercise } from './exerciseLibrary';
import { isScheduled, moveDate } from './rules';

/** The next day (from `from`, inclusive, within `days`) on which an active gym session is scheduled, with the session. */
export function nextGymSession(habits: readonly HabitDto[], from: string, days = 14): { date: string; habit: HabitDto } | null {
  const gym = habits.filter(h => h.status === 'ACTIVE' && isGymHabit(h));
  for (let i = 0; i < days; i++) {
    const date = moveDate(from, i);
    const habit = gym.find(h => isScheduled(h, date));
    if (habit) return { date, habit };
  }
  return null;
}
export const hasGymHabit = (habits: readonly HabitDto[]) => habits.some(h => h.status === 'ACTIVE' && isGymHabit(h));

/** The exercises of a session with the sets and reps its checklist asks for (a line's target ÷ step is its sets; otherwise the library default). */
export function plannedLines(objectives: readonly { title: string; unit?: string; target: number; step: number }[]): Exercise[] {
  return objectives.flatMap(o => {
    const e = exerciseByName(o.title);
    if (!e || !isLibraryLine(o)) return [];
    return [{ ...e, sets: o.step > 0 && o.target % o.step === 0 ? o.target / o.step : e.sets, reps: o.step > 0 ? o.step : e.reps }];
  });
}
