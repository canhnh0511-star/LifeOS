import type { BossTier, GoalCategory } from '../api/types';

/** Boss tier from reward: 1 Minion <=40, 2 Elite 41-55, 3 Champion 56-70, 4 Legend 71-85, 5 Mythic 86-100. */
export function tierForXp(xpReward: number): BossTier {
  return xpReward <= 40 ? 1 : xpReward <= 55 ? 2 : xpReward <= 70 ? 3 : xpReward <= 85 ? 4 : 5;
}

export interface ChapterConfig { index: number; title: string; badgeName: string; fromDay: number; toDay: number; }
export interface BossConfig { code: string; chapter: number; name: string; category: GoalCategory; targetMinutes: number; xpReward: number; tier: BossTier; requiredLevel: number; artKey: string; }

/** Campaign chapters by day of the 66-day journey (1-based, inclusive). */
export const CHAPTERS: ChapterConfig[] = [
  { index: 1, title: 'Khởi động', badgeName: 'Huy hiệu Người khởi hành', fromDay: 1, toDay: 7 },
  { index: 2, title: 'Vào nhịp', badgeName: 'Huy hiệu Vào guồng', fromDay: 8, toDay: 21 },
  { index: 3, title: 'Bền bỉ', badgeName: 'Huy hiệu Kiên cường', fromDay: 22, toDay: 44 },
  { index: 4, title: 'Chinh phục', badgeName: 'Huy hiệu Kẻ chinh phục', fromDay: 45, toDay: 66 }
];

/** Boss catalog is configuration: add a boss here without changing any rule. See .scratch/rpg-campaign/spec.md. */
export const BOSS_CATALOG: BossConfig[] = [
  { code: 'SLIME_OF_INERTIA', chapter: 1, name: 'Slime of Inertia', category: 'MINDFULNESS', targetMinutes: 60, xpReward: 40, tier: 1, requiredLevel: 1, artKey: 'slime-of-inertia' },
  { code: 'GARGOYLE_OF_DISTRACTION', chapter: 2, name: 'Gargoyle of Distraction', category: 'KNOWLEDGE', targetMinutes: 90, xpReward: 50, tier: 2, requiredLevel: 1, artKey: 'gargoyle-of-distraction' },
  { code: 'TROLL_OF_BURNOUT', chapter: 3, name: 'Troll of Burnout', category: 'HEALTH', targetMinutes: 120, xpReward: 65, tier: 3, requiredLevel: 2, artKey: 'troll-of-burnout' },
  { code: 'DRAGON_OF_PROCRASTINATION', chapter: 4, name: 'Dragon of Procrastination', category: 'CAREER', targetMinutes: 180, xpReward: 100, tier: 5, requiredLevel: 3, artKey: 'dragon-of-procrastination' }
];
