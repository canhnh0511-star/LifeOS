import { describe, expect, it } from 'vitest';
import { EXERCISES } from './exerciseLibrary';
import { hasInfo, infoFor } from './exerciseInfo';

describe('exercise info (B-37)', () => {
  it('covers every library exercise with equipment and at least one technique cue', () => {
    for (const e of EXERCISES) { expect(hasInfo(e), e.id).toBe(true); const x = infoFor(e); expect(x.equipment.length).toBeGreaterThan(0); expect(x.cues.length).toBeGreaterThan(0); expect(x.secondary).not.toContain(e.group); }
  });
});
