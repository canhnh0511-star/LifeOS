import { rankForLevel, type Rank } from './ranks';
import { stageForLevel } from './characterStage';
import { gearTier, MAX_GEAR_TIER } from './characterGear';

/** What the next level brings (B-40). Everything is derived from the level; nothing here gives XP. */
export interface NextReward { level: number; xpToGo: number; rankUp: { rank: Rank; name: string } | null; newGearTier: number | null; levelsToNextRank: number | null; nextRank: { rank: Rank; name: string } | null; }

export function nextLevelReward(level: number, totalXp: number, nextLevelXp: number): NextReward {
  const next = level + 1;
  const rank = rankForLevel(level), nextRank = rankForLevel(next);
  let ahead: number | null = null;
  for (let l = next; l <= next + 40; l++) if (rankForLevel(l) !== rank) { ahead = l - level; break; }
  const upRank = ahead ? rankForLevel(level + ahead) : null;
  return {
    level: next, xpToGo: Math.max(0, nextLevelXp - totalXp),
    rankUp: nextRank !== rank ? { rank: nextRank, name: stageForLevel(next).name } : null,
    newGearTier: gearTier(next) > gearTier(level) ? gearTier(next) : null,
    levelsToNextRank: ahead, nextRank: upRank ? { rank: upRank, name: stageForLevel(level + ahead!).name } : null
  };
}
export { MAX_GEAR_TIER };
