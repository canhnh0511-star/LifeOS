import type { HabitDto } from '../api/types';
import { isGymHabit } from './exerciseLibrary';
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
