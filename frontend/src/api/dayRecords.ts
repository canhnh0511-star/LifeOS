import type { LifeOsApi } from './client';

/**
 * Forget what was recorded on one day: logged sets, completions and checklist progress, using only the normal API calls
 * (undo completion, delete set, set progress to 0), so XP, chests and badges stay consistent on the real server too.
 * The plan itself is untouched. A set can only be deleted for a day inside the 7-day window the API allows.
 */
export async function clearDayRecords(api: Pick<LifeOsApi, 'getQuests' | 'getWorkoutSets' | 'removeWorkoutSet' | 'undoQuest' | 'setObjective'>, date: string): Promise<{ sets: number; completed: number; progress: number }> {
  let sets = 0, completed = 0, progress = 0;
  for (const q of await api.getQuests(date)) {
    for (const s of await api.getWorkoutSets(q.habitId, date)) { await api.removeWorkoutSet(q.habitId, date, s.exercise, s.setNo); sets++; }
    if (q.status === 'COMPLETED') { await api.undoQuest(q.habitId, date); completed++; }
  }
  for (const q of await api.getQuests(date)) {
    for (const o of q.objectives) if (o.value > 0) { await api.setObjective(q.habitId, date, o.id, 0); progress++; }
  }
  return { sets, completed, progress };
}
