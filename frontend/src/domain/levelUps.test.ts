import { describe, expect, it } from 'vitest';
import type { AreaStatDto, GoalCategory, ProgressDto } from '../api/types';
import { levelUps } from './levelUps';

const area = (category: GoalCategory, level: number): AreaStatDto => ({ category, xp: 0, level, levelStartXp: 0, nextLevelXp: 0 });
const progress = (level: number, areas: [GoalCategory, number][]): ProgressDto => ({ totalXp: 0, level, levelStartXp: 0, nextLevelXp: 0, currentStreak: 0, longestStreak: 0, areas: areas.map(([c, l]) => area(c, l)) });

describe('levelUps', () => {
  it('reports the new overall level only when it rose', () => {
    expect(levelUps(progress(4, []), progress(5, [])).level).toBe(5);
    expect(levelUps(progress(4, []), progress(4, [])).level).toBeNull();
    expect(levelUps(progress(5, []), progress(4, [])).level).toBeNull();
  });
  it('lists every area whose level rose, with its new level', () => {
    const before = progress(4, [['CAREER', 2], ['HEALTH', 1], ['KNOWLEDGE', 1]]);
    const after = progress(4, [['CAREER', 3], ['HEALTH', 1], ['KNOWLEDGE', 2]]);
    expect(levelUps(before, after).areas).toEqual([{ category: 'CAREER', level: 3 }, { category: 'KNOWLEDGE', level: 2 }]);
  });
  it('ignores area drops and reports nothing without a previous snapshot', () => {
    expect(levelUps(progress(4, [['CAREER', 3]]), progress(4, [['CAREER', 2]])).areas).toEqual([]);
    expect(levelUps(undefined, progress(9, [['CAREER', 9]]))).toEqual({ level: null, areas: [] });
  });
});
