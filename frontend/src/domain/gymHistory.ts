import type { QuestDto, WorkoutSetDto } from '../api/types';
import { isGymHabit } from './exerciseLibrary';
import { moveDate } from './rules';
import type { DaySets } from './workoutStats';

type HistoryApi = { getQuests(date: string): Promise<QuestDto[]>; getWorkoutSets(habitId: string, date: string): Promise<WorkoutSetDto[]> };

/**
 * The set log of the last `days` days up to `today`, oldest first. It reads the days' quests and only asks for the sets of gym sessions.
 * Interim client-side aggregation (RFC-gym-stats): a server `weeks[]` statistic would replace these requests.
 */
export async function loadGymHistory(api: HistoryApi, today: string, days = 35): Promise<DaySets[]> {
  const dates = Array.from({ length: days }, (_, i) => moveDate(today, i - days + 1));
  return Promise.all(dates.map(async date => {
    const gym = (await api.getQuests(date)).filter(q => isGymHabit({ objectives: q.objectives }));
    const sets = (await Promise.all(gym.map(q => api.getWorkoutSets(q.habitId, date)))).flat();
    return { date, sets };
  }));
}
