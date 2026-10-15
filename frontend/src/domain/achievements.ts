import type { AchievementCode, CategoryStatDto } from '../api/types';
import { ALL_CATEGORIES } from './insights';

export interface AchievementConfig { code: AchievementCode; name: string; description: string; xpReward: number; }

/** Catalog is configuration. Rewards are 10-30 XP and granted once per campaign (docs/DOMAIN_RULES.md). */
export const ACHIEVEMENT_CATALOG: AchievementConfig[] = [
  { code: 'STREAK_7', name: 'Bảy phiên liền', description: 'Giữ streak của một thói quen đủ 7 phiên đã lên lịch.', xpReward: 20 },
  { code: 'BALANCED', name: 'Cân bằng', description: 'Cả 5 lĩnh vực đều có nhiệm vụ và hoàn thành từ 60% trong 7 ngày gần nhất.', xpReward: 30 },
  { code: 'COMEBACK', name: 'Trở lại mạnh mẽ', description: 'Sau khi một streak từ 3 phiên bị đứt, hoàn thành lại 3 phiên liên tiếp.', xpReward: 20 }
];

export const STREAK_TARGET = 7;
export const BALANCED_THRESHOLD = 0.6;
export const COMEBACK_RUN = 3;

/** Every area has scheduled work and finished at least 60% of it. */
export function balancedAchieved(categories: readonly CategoryStatDto[]): boolean {
  return ALL_CATEGORIES.every(category => {
    const stat = categories.find(c => c.category === category);
    return !!stat && stat.scheduled > 0 && stat.completed / stat.scheduled >= BALANCED_THRESHOLD;
  });
}

/**
 * `sessions` holds one boolean per required session, oldest first (true = completed).
 * A comeback is a run of 3+ completions, then at least one miss, then another run of 3+ completions.
 */
export function comebackAchieved(sessions: readonly boolean[]): boolean {
  let run = 0;
  let brokenStreak = false;
  for (const done of sessions) {
    if (done) {
      run++;
      if (brokenStreak && run >= COMEBACK_RUN) return true;
    } else {
      if (run >= COMEBACK_RUN) brokenStreak = true;
      run = 0;
    }
  }
  return false;
}

/** Splits an achievement reward evenly over the 5 areas (a remainder goes to the first areas), so the ledger stays per-area. */
export function spreadAcrossAreas(xp: number): number[] {
  const base = Math.floor(xp / ALL_CATEGORIES.length);
  const extra = xp - base * ALL_CATEGORIES.length;
  return ALL_CATEGORIES.map((_, i) => base + (i < extra ? 1 : 0));
}
