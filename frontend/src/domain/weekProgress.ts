import type { HabitDto } from '../api/types';
import { exerciseByName, isGymHabit, isLibraryLine, type MuscleGroup } from './exerciseLibrary';
import { moveDate, isScheduled } from './rules';
import type { DaySets } from './workoutStats';

/** What the week asks for (gym sessions and sets per muscle group) and what the set log shows. Read-only; nothing here gives XP. */
export interface PlannedWeek { sessions: number; sets: Map<MuscleGroup, number>; }
export interface MaxWeightTrend { exercise: string; points: number[]; latest: number; delta: number; }

export function plannedWeek(habits: readonly HabitDto[], weekStartDate: string): PlannedWeek {
  const out: PlannedWeek = { sessions: 0, sets: new Map() };
  for (const h of habits) {
    if (h.status !== 'ACTIVE' || !isGymHabit(h)) continue;
    for (let i = 0; i < 7; i++) {
      if (!isScheduled(h, moveDate(weekStartDate, i))) continue;
      out.sessions++;
      for (const o of h.objectives) {
        const e = exerciseByName(o.title);
        if (!e || !isLibraryLine(o)) continue;
        const sets = o.step > 0 && o.target % o.step === 0 ? o.target / o.step : e.sets;
        out.sets.set(e.group, (out.sets.get(e.group) ?? 0) + sets);
      }
    }
  }
  return out;
}

export function setsByGroup(days: readonly DaySets[], weekStartDate: string): Map<MuscleGroup, number> {
  const end = moveDate(weekStartDate, 7), m = new Map<MuscleGroup, number>();
  for (const d of days) if (d.date >= weekStartDate && d.date < end) for (const x of d.sets) { const g = exerciseByName(x.exercise)?.group; if (g) m.set(g, (m.get(g) ?? 0) + 1); }
  return m;
}

/** Heaviest weight of each exercise's last `points` sessions (progressive overload); most-trained first, then most recent. */
export function maxWeightTrends(days: readonly DaySets[], points = 5, top = 3): MaxWeightTrend[] {
  const by = new Map<string, { exercise: string; maxes: number[]; last: string }>();
  for (const d of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    const day = new Map<string, number>();
    for (const x of d.sets) if (x.weightKg) day.set(x.exercise, Math.max(day.get(x.exercise) ?? 0, x.weightKg));
    for (const [exercise, w] of day) { const c = by.get(exercise.toLowerCase()) ?? { exercise, maxes: [], last: d.date }; c.maxes.push(w); c.last = d.date; by.set(exercise.toLowerCase(), c); }
  }
  return [...by.values()].sort((a, b) => b.maxes.length - a.maxes.length || b.last.localeCompare(a.last)).slice(0, top).map(c => {
    const p = c.maxes.slice(-points);
    return { exercise: c.exercise, points: p, latest: p[p.length - 1], delta: p[p.length - 1] - p[0] };
  });
}
