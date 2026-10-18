import type { GoalDto, HabitDto } from '../api/types';
import { isGymHabit, type Exercise } from './exerciseLibrary';
import { infoFor } from './exerciseInfo';
import { STANDARD_PLAN_TITLE } from './standardPlan';

/** Weekday short names, Monday = 1. */
export const DAY_LABEL: Record<number, string> = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 7: 'CN' };

/** Whether a goal is the account's standard gym plan (its title is how the plan is recognised). */
export const isStandardPlanGoal = (title: string | undefined) => !!title && title.trim().toLowerCase() === STANDARD_PLAN_TITLE.toLowerCase();

/**
 * Suggested rest between sets, in seconds, for a session of the standard plan: 90 for compound lifts, 60 for the rest (muscle gain).
 * Sessions of any other plan, e.g. one made earlier, keep the library's own suggestion. General guidance; a trainer should review it.
 */
export function restSecondsFor(goalTitle: string | undefined, e: Exercise): number | undefined {
  if (!isStandardPlanGoal(goalTitle)) return e.restSeconds;
  return infoFor(e).kind === 'COMPOUND' ? 90 : 60;
}

/**
 * What starting the standard plan replaces: the active gym sessions (so two plans never put two sessions on the same day), and the goals that hold nothing but them.
 * A goal that also has non-gym habits stays; only its gym habits are archived.
 */
export function replacementFor(goals: readonly GoalDto[], habits: readonly HabitDto[]): { goalIds: string[]; habitIds: string[] } {
  const standard = new Set(goals.filter(g => isStandardPlanGoal(g.title)).map(g => g.id)); // the standard plan itself is never replaced: starting it again is a no-op
  const gym = habits.filter(h => h.status === 'ACTIVE' && isGymHabit(h) && !standard.has(h.goalId));
  const goalIds = [...new Set(gym.map(h => h.goalId))].filter(id => {
    const goal = goals.find(g => g.id === id);
    return !!goal && goal.status === 'ACTIVE' && habits.filter(h => h.goalId === id && h.status === 'ACTIVE').every(h => isGymHabit(h));
  });
  return { goalIds, habitIds: gym.map(h => h.id) };
}
