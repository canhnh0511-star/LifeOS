import { describe, expect, it } from 'vitest';
import { EXERCISES, exerciseByName } from './exerciseLibrary';
import { STANDARD_DAYS } from './standardPlan';
import { GUIDES, guideFor } from './exerciseGuide';

const week1Ids = [...new Set(STANDARD_DAYS.flatMap(d => d.lines.map(l => exerciseByName(l.title)!.id)))]; // the exercises of the standard plan

describe('exercise guides (beginner teaching content)', () => {
  it('covers every exercise of the standard plan with setup, 3-5 steps, breathing and 2-4 common mistakes', () => {
    expect(week1Ids.length).toBe(11);
    for (const id of week1Ids) {
      const g = guideFor(id);
      expect(g, id).toBeTruthy();
      expect(g!.setup.length, id).toBeGreaterThanOrEqual(2);
      expect(g!.steps.length, id).toBeGreaterThanOrEqual(3); expect(g!.steps.length, id).toBeLessThanOrEqual(5);
      expect(g!.breathing.trim().length, id).toBeGreaterThan(10);
      expect(g!.mistakes.length, id).toBeGreaterThanOrEqual(2); expect(g!.mistakes.length, id).toBeLessThanOrEqual(4);
    }
  });
  it('only describes exercises that exist, and has no empty lines', () => {
    const ids = new Set(EXERCISES.map(e => e.id));
    for (const [id, g] of Object.entries(GUIDES)) {
      expect(ids.has(id), id).toBe(true);
      for (const line of [...g.setup, ...g.steps, ...g.mistakes, g.breathing]) expect(line.trim().length, id).toBeGreaterThan(5);
    }
  });
  it('returns nothing for an exercise that has not been written yet', () => { expect(guideFor('bench-press')).toBeUndefined(); });
});
