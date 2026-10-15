import type { GoalCategory, ProgressDto } from '../api/types';

export interface LevelUps { level: number | null; areas: { category: GoalCategory; level: number }[]; }

/** What went up between two progress snapshots: the overall level and any area levels. Drops are not celebrated. */
export function levelUps(previous: ProgressDto | undefined, next: ProgressDto): LevelUps {
  if (!previous) return { level: null, areas: [] };
  const areas = next.areas.filter(a => a.level > (previous.areas.find(p => p.category === a.category)?.level ?? a.level));
  return { level: next.level > previous.level ? next.level : null, areas: areas.map(a => ({ category: a.category, level: a.level })) };
}
