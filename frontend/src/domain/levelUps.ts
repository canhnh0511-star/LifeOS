import type { GoalCategory, ProgressDto } from '../api/types';
import { rankForLevel, type Rank } from './ranks';

export interface LevelUps { level: number | null; areas: { category: GoalCategory; level: number }[]; /** Set only when the level rise crossed into a higher rank. */ rank?: Rank; }

/** What went up between two progress snapshots: the overall level and any area levels. Drops are not celebrated. */
export function levelUps(previous: ProgressDto | undefined, next: ProgressDto): LevelUps {
  if (!previous) return { level: null, areas: [] };
  const areas = next.areas.filter(a => a.level > (previous.areas.find(p => p.category === a.category)?.level ?? a.level));
  const leveledUp = next.level > previous.level;
  const rank = rankForLevel(next.level);
  return { level: leveledUp ? next.level : null, areas: areas.map(a => ({ category: a.category, level: a.level })), ...(leveledUp && rank !== rankForLevel(previous.level) ? { rank } : {}) };
}
