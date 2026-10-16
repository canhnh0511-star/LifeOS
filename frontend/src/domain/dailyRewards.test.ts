import { describe, expect, it } from 'vitest';
import { hasChests, rewardThreshold } from './dailyRewards';

describe('daily chests', () => {
  it('only exist on days with at least three scheduled quests', () => {
    expect([0, 1, 2, 3, 4].map(hasChests)).toEqual([false, false, false, true, true]);
  });
  it('round the thresholds up', () => {
    expect([3, 4, 5].map(n => [rewardThreshold(n, 50), rewardThreshold(n, 80), rewardThreshold(n, 100)])).toEqual([[2, 3, 3], [2, 4, 4], [3, 4, 5]]);
  });
});
