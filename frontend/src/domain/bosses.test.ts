import { describe, expect, it } from 'vitest';
import { BOSS_CATALOG, CHAPTERS, tierForXp } from './bosses';

describe('boss catalog', () => {
  it('maps xpReward to tiers at the documented boundaries', () => {
    expect([1, 40, 41, 55, 56, 70, 71, 85, 86, 100].map(tierForXp)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
  it('has one boss per chapter and every declared tier matches its XP', () => {
    expect(BOSS_CATALOG).toHaveLength(CHAPTERS.length);
    for (const boss of BOSS_CATALOG) expect(boss.tier).toBe(tierForXp(boss.xpReward));
  });
  it('splits the 66-day journey into consecutive chapters without gaps', () => {
    expect(CHAPTERS[0].fromDay).toBe(1);
    CHAPTERS.slice(1).forEach((c, i) => expect(c.fromDay).toBe(CHAPTERS[i].toDay + 1));
    expect(CHAPTERS.at(-1)!.toDay).toBe(66);
  });
});
