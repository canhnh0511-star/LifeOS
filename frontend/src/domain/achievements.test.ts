import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_CATALOG, balancedAchieved, comebackAchieved, spreadAcrossAreas } from './achievements';
import { ALL_CATEGORIES } from './insights';

const stats = (done: number, total = 10) => ALL_CATEGORIES.map(category => ({ category, scheduled: total, completed: done }));

describe('achievement catalog', () => {
  it('keeps rewards between 10 and 30 XP with unique codes', () => {
    expect(new Set(ACHIEVEMENT_CATALOG.map(a => a.code)).size).toBe(ACHIEVEMENT_CATALOG.length);
    for (const a of ACHIEVEMENT_CATALOG) { expect(a.xpReward).toBeGreaterThanOrEqual(10); expect(a.xpReward).toBeLessThanOrEqual(30); }
  });
});

describe('balancedAchieved', () => {
  it('needs every area at 60% or more', () => {
    expect(balancedAchieved(stats(6))).toBe(true);
    expect(balancedAchieved(stats(5))).toBe(false);
  });
  it('fails when an area has no scheduled work, instead of treating it as 0% or 100%', () => {
    expect(balancedAchieved(stats(10).slice(1))).toBe(false);
    expect(balancedAchieved([...stats(10).slice(1), { category: 'CAREER', scheduled: 0, completed: 0 }])).toBe(false);
  });
});

describe('comebackAchieved', () => {
  const T = true, F = false;
  it('detects 3+ run, a miss, then 3 completions', () => {
    expect(comebackAchieved([T, T, T, F, T, T, T])).toBe(true);
    expect(comebackAchieved([T, T, T, F, F, T, T, T, T])).toBe(true);
  });
  it('does not count a short first streak, a short recovery or no miss', () => {
    expect(comebackAchieved([T, T, F, T, T, T])).toBe(false);
    expect(comebackAchieved([T, T, T, F, T, T])).toBe(false);
    expect(comebackAchieved([T, T, T, T, T, T])).toBe(false);
    expect(comebackAchieved([])).toBe(false);
  });
  it('lets a later cycle qualify after an earlier short one', () => {
    expect(comebackAchieved([T, F, T, T, T, F, T, T, T])).toBe(true);
  });
});

describe('spreadAcrossAreas', () => {
  it('conserves the total across the 5 areas', () => {
    for (const xp of [10, 20, 22, 30]) expect(spreadAcrossAreas(xp).reduce((a, b) => a + b, 0)).toBe(xp);
    expect(spreadAcrossAreas(30)).toEqual([6, 6, 6, 6, 6]);
  });
});
