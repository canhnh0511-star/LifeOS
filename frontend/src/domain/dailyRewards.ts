import type { DailyRewardTier } from '../api/types';

export const DAILY_TIERS: { tier: DailyRewardTier; percent: number; xp: number; name: string }[] = [
  { tier: 'WOOD', percent: 50, xp: 10, name: 'Rương gỗ' },
  { tier: 'SILVER', percent: 80, xp: 20, name: 'Rương bạc' },
  { tier: 'GOLD', percent: 100, xp: 40, name: 'Rương vàng' }
];
/** A day needs at least this many scheduled quests to have chests (mirrors the backend): with 1 or 2 the chests would pay more than the quests. */
export const MIN_QUESTS_FOR_CHESTS = 3;
export const hasChests = (scheduled: number) => scheduled >= MIN_QUESTS_FOR_CHESTS;
export const tierName = (tier: string) => DAILY_TIERS.find(t => t.tier === tier)?.name ?? tier;
/** Quests needed to open a chest: its share of the day's scheduled quests, rounded up (mirrors the backend). */
export const rewardThreshold = (scheduled: number, percent: number) => Math.ceil(scheduled * percent / 100);
