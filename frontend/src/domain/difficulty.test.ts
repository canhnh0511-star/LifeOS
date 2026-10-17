import { describe, expect, it } from 'vitest';
import { difficultyForXp } from './difficulty';

describe('difficultyForXp', () => {
  it('uses the thresholds Easy 0-20, Medium 21-40, Hard 41 and up', () => {
    expect([0, 20].map(difficultyForXp)).toEqual(['EASY', 'EASY']);
    expect([21, 40].map(difficultyForXp)).toEqual(['MEDIUM', 'MEDIUM']);
    expect([41, 100, 250].map(difficultyForXp)).toEqual(['HARD', 'HARD', 'HARD']);
  });
});
