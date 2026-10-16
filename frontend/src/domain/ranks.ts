/** Hunter-style rank, derived from a level (no stored state). Own naming and bands; see B-20. */
export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

const BANDS: { rank: Rank; from: number }[] = [
  { rank: 'E', from: 1 }, { rank: 'D', from: 5 }, { rank: 'C', from: 10 }, { rank: 'B', from: 15 }, { rank: 'A', from: 20 }, { rank: 'S', from: 30 }
];

export function rankForLevel(level: number): Rank {
  let rank: Rank = 'E';
  for (const band of BANDS) if (level >= band.from) rank = band.rank;
  return rank;
}
