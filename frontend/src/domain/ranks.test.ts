import { describe, expect, it } from 'vitest';
import { rankForLevel, xpToNextRank } from "./ranks";
import { levelUps } from './levelUps';
import type { ProgressDto } from '../api/types';

describe('ranks', () => {
  it('changes rank exactly at the thresholds', () => {
    const at = (l: number) => rankForLevel(l);
    expect([at(1), at(4), at(5), at(9), at(10), at(14), at(15), at(19), at(20), at(29), at(30), at(80)]).toEqual(['E', 'E', 'D', 'D', 'C', 'C', 'B', 'B', 'A', 'A', 'S', 'S']);
  });
  it('reports a rank only when a level rise crosses into a higher rank', () => {
    const p = (level: number): ProgressDto => ({ totalXp: 0, level, levelStartXp: 0, nextLevelXp: 1, currentStreak: 0, longestStreak: 0, areas: [] });
    expect(levelUps(p(4), p(5)).rank).toBe('D');
    expect(levelUps(p(5), p(6)).rank).toBeUndefined();
    expect(levelUps(p(5), p(4)).rank).toBeUndefined();
    expect(levelUps(p(4), p(4)).level).toBeNull();
    expect(levelUps(p(4), p(10)).rank).toBe('C'); // a jump over a rank reports the rank reached
    expect(levelUps(p(4), p(4)).rank).toBeUndefined();
  });
});

describe('xpToNextRank', () => {
  it('counts the XP still missing to the first level of the next rank', () => {
    expect(xpToNextRank(4, 2170)).toEqual({ rank: 'D', xp: 330 }); // level 5 starts at 2500 XP
    expect(xpToNextRank(1, 0)).toEqual({ rank: 'D', xp: 2500 });
  });
  it('is null at rank S', () => { expect(xpToNextRank(30, 90000)).toBeNull(); });
});
