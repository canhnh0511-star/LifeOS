import { describe, expect, it } from 'vitest';
import { exerciseByName } from './exerciseLibrary';
import { STANDARD_DAYS_BY_VARIANT } from './standardPlan';

const STANDARD_DAYS = Object.values(STANDARD_DAYS_BY_VARIANT).flat(); // every version of the standard plan
import { exerciseCrop, exerciseImage, EXERCISE_CROP, EXERCISE_IMAGES } from './exerciseImage';

const planIds = [...new Set(STANDARD_DAYS.flatMap(d => d.lines.map(l => exerciseByName(l.title)!.id)))];

describe('exercise images', () => {
  it('has a picture for every exercise of the standard plan', () => {
    for (const id of planIds) expect(exerciseImage(id), id).toBe(`/art/exercises/${id}.jpg`);
  });
  it('only lists pictures that exist on disk', async () => {
    // @ts-ignore node builtin, test-only
    const fs = await import('node:fs');
    for (const id of EXERCISE_IMAGES) expect(fs.existsSync(`public/art/exercises/${id}.jpg`), id).toBe(true);
  });
  it('returns nothing for an exercise without a picture', () => { expect(exerciseImage('bench-press')).toBeUndefined(); });
  it('has a crop band for every picture, inside the file and tall enough to show both poses', () => {
    for (const id of EXERCISE_IMAGES) {
      const [top, bottom] = EXERCISE_CROP[id] ?? [NaN, NaN];
      expect(top, id).toBeGreaterThanOrEqual(0); expect(bottom, id).toBeLessThanOrEqual(640); expect(bottom - top, id).toBeGreaterThan(160);
    }
    expect(Object.keys(EXERCISE_CROP).sort()).toEqual([...EXERCISE_IMAGES].sort());
  });
  it('turns a band into a box ratio and a vertical position (a full-height file starts at the top)', () => {
    expect(exerciseCrop('goblet-squat')).toEqual({ aspectRatio: '640 / 593', objectPosition: `50% ${(18 / 47) * 100}%` });
    expect(exerciseCrop('leg-press')).toEqual({ aspectRatio: '640 / 436', objectPosition: `50% ${(98 / 204) * 100}%` });
    expect(exerciseCrop('unknown')).toEqual({ aspectRatio: '640 / 640', objectPosition: '50% 0%' });
  });
});
