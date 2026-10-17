import { describe, expect, it } from 'vitest';
import { nextLevelReward } from './nextReward';

describe('nextLevelReward (B-40)', () => {
  it('reports the XP still needed and a new gear tier while gear is still growing', () => {
    const r = nextLevelReward(2, 400, 900);
    expect(r).toMatchObject({ level: 3, xpToGo: 500, rankUp: null, newGearTier: 3 });
  });
  it('flags a rank-up exactly at the band edge and counts levels to the next rank otherwise', () => {
    expect(nextLevelReward(4, 1500, 2500)).toMatchObject({ level: 5, rankUp: { rank: 'D' }, levelsToNextRank: 1 });
    expect(nextLevelReward(6, 0, 100)).toMatchObject({ rankUp: null, levelsToNextRank: 4, nextRank: { rank: 'C' } });
  });
  it('has no next rank past S and never reports negative XP', () => {
    const r = nextLevelReward(35, 10, 5);
    expect(r.xpToGo).toBe(0); expect(r.nextRank).toBeNull(); expect(r.levelsToNextRank).toBeNull(); expect(r.newGearTier).toBeNull();
  });
});
