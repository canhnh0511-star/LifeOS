import { describe, expect, it } from 'vitest';
import { levelReached } from './Celebration';

describe('levelReached', () => {
  it('reports only a real increase', () => {
    expect(levelReached(4, 5)).toBe(5);
    expect(levelReached(4, 4)).toBeNull();
    expect(levelReached(5, 4)).toBeNull();
    expect(levelReached(undefined, 5)).toBeNull();
  });
});
