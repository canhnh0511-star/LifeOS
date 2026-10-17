import { exerciseByName, type MuscleGroup } from './exerciseLibrary';
import { moveDate } from './rules';
import type { DaySets } from './workoutStats';

/**
 * Gym-only hunter stats, derived from logged sets (RFC-gym-stats). Nothing here is stored or touches XP.
 * Every relative stat is read against the user's own previous 4 weeks: matching them scores 70, +43% scores 100.
 */
export interface Shadow { exercise: string; date: string; weightKg: number; }
export interface BossProgress { done: number; planned: number; defeated: boolean; }
export interface HunterStats { strength: number | null; endurance: number | null; volume: number | null; balance: number | null; will: number | null; }

const GROUPS = 6;
const score = (ratio: number) => Math.max(0, Math.min(100, Math.round(ratio * 70)));
const key = (name: string) => name.trim().toLowerCase();
const inRange = (d: DaySets, from: string, to: string) => d.date >= from && d.date < to;

/** A shadow per personal record: a weight above the exercise's earlier heaviest. The first log and ties only set the bar. */
export function shadows(days: readonly DaySets[]): Shadow[] {
  const best = new Map<string, number>(), out: Shadow[] = [];
  for (const d of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    const dayBest = new Map<string, { exercise: string; weightKg: number }>();
    for (const x of d.sets) if (x.weightKg) { const c = dayBest.get(key(x.exercise)); if (!c || x.weightKg > c.weightKg) dayBest.set(key(x.exercise), { exercise: x.exercise, weightKg: x.weightKg }); }
    for (const [k, v] of dayBest) {
      const prior = best.get(k);
      if (prior !== undefined && v.weightKg > prior) out.push({ exercise: v.exercise, date: d.date, weightKg: v.weightKg });
      if (prior === undefined || v.weightKg > prior) best.set(k, v.weightKg);
    }
  }
  return out;
}

/** The weekly boss: its HP is the sessions planned for the week; each day with logged sets removes one. */
export function bossProgress(days: readonly DaySets[], weekStartDate: string, planned: number): BossProgress {
  const end = moveDate(weekStartDate, 7);
  const done = days.filter(d => inRange(d, weekStartDate, end) && d.sets.length > 0).length;
  return { done, planned, defeated: planned > 0 && done >= planned };
}

export function hunterStats(days: readonly DaySets[], weekStartDate: string, planned: number): HunterStats {
  const end = moveDate(weekStartDate, 7), baseFrom = moveDate(weekStartDate, -28);
  const cur = days.filter(d => inRange(d, weekStartDate, end)).flatMap(d => d.sets);
  const base = days.filter(d => inRange(d, baseFrom, weekStartDate)).flatMap(d => d.sets);
  const weighted = (sets: typeof cur) => sets.filter(x => x.weightKg);

  const maxBy = (sets: typeof cur) => { const m = new Map<string, number>(); for (const x of weighted(sets)) m.set(key(x.exercise), Math.max(m.get(key(x.exercise)) ?? 0, x.weightKg!)); return m; };
  const cm = maxBy(cur), bm = maxBy(base), ratios = [...cm].filter(([k]) => bm.has(k)).map(([k, v]) => v / bm.get(k)!);
  const strength = ratios.length ? score(ratios.reduce((a, b) => a + b, 0) / ratios.length) : null;

  const avgReps = (sets: typeof cur) => { const w = weighted(sets); return w.length ? w.reduce((a, x) => a + x.reps, 0) / w.length : null; };
  const cr = avgReps(cur), br = avgReps(base);
  const endurance = cr !== null && br ? score(cr / br) : null;

  const volume = base.length && cur.length ? score(cur.length / (base.length / 4)) : null;

  const counts = new Map<MuscleGroup, number>();
  for (const x of days.filter(d => inRange(d, moveDate(weekStartDate, -21), end)).flatMap(d => d.sets)) { const g = exerciseByName(x.exercise)?.group; if (g) counts.set(g, (counts.get(g) ?? 0) + 1); }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const balance = total ? Math.round(-[...counts.values()].reduce((a, c) => a + (c / total) * Math.log(c / total), 0) / Math.log(GROUPS) * 100) + 0 : null;

  const will = planned > 0 ? Math.min(100, Math.round(bossProgress(days, weekStartDate, planned).done / planned * 100)) : null;
  return { strength, endurance, volume, balance, will };
}
