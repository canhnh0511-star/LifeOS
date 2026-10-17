import { describe, expect, it } from 'vitest';
import { ALL_STAGES, stageForLevel } from './characterStage';
import { rankForLevel } from './ranks';

describe('character stage (B-28)', () => {
  it('changes exactly at the rank thresholds, never anywhere else', () => {
    const names = (levels: number[]) => levels.map(l => stageForLevel(l).name);
    expect(new Set(names([1, 2, 3, 4])).size).toBe(1);
    expect(stageForLevel(4).rank).toBe('E'); expect(stageForLevel(5).rank).toBe('D');
    expect(stageForLevel(9).rank).toBe('D'); expect(stageForLevel(10).rank).toBe('C');
    expect(stageForLevel(14).rank).toBe('C'); expect(stageForLevel(15).rank).toBe('B');
    expect(stageForLevel(19).rank).toBe('B'); expect(stageForLevel(20).rank).toBe('A');
    expect(stageForLevel(29).rank).toBe('A'); expect(stageForLevel(30).rank).toBe('S');
    for (let l = 1; l <= 60; l++) expect(stageForLevel(l).rank).toBe(rankForLevel(l));
  });
  it('gives every stage its own name and colour, and never fewer rings than the stage before', () => {
    expect(new Set(ALL_STAGES.map(s => s.name)).size).toBe(ALL_STAGES.length);
    expect(new Set(ALL_STAGES.map(s => s.rgb)).size).toBe(ALL_STAGES.length);
    ALL_STAGES.forEach((s, i) => { if (i) expect(s.rings.length).toBeGreaterThanOrEqual(ALL_STAGES[i - 1].rings.length); });
  });
  it('copes with odd levels without throwing', () => {
    expect(stageForLevel(0).rank).toBe('E'); expect(stageForLevel(-3).rank).toBe('E'); expect(stageForLevel(500).rank).toBe('S');
  });
});
