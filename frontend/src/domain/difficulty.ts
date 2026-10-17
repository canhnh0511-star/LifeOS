/** Display-only difficulty, read from a quest's XP reward (RPG-02). It never changes the reward. */
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export function difficultyForXp(xp: number): Difficulty {
  if (xp <= 20) return 'EASY';
  if (xp <= 40) return 'MEDIUM';
  return 'HARD';
}
export const difficultyLabel: Record<Difficulty, string> = { EASY: 'Dễ', MEDIUM: 'Vừa', HARD: 'Khó' };
