import { describe, expect, it } from 'vitest';
import { exerciseByName } from './exerciseLibrary';
import { STANDARD_DAYS } from './standardPlan';
import { exerciseImage, EXERCISE_IMAGES } from './exerciseImage';

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
});
