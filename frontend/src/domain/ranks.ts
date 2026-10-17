/** Hunter-style rank, derived from a level (no stored state). Own naming and bands; see B-20. */
export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

const BANDS: { rank: Rank; from: number }[] = [
  { rank: 'E', from: 1 }, { rank: 'D', from: 5 }, { rank: 'C', from: 10 }, { rank: 'B', from: 15 }, { rank: 'A', from: 20 }, { rank: 'S', from: 30 }
];

/** Gate difficulty from the boss tier: tier 1 = a rank-E gate ... tier 5 = rank A. Returns a level inside that rank's band. */
export function gateRank(tier: number): number {
  const gates = BANDS.slice(0, 5); // E..A; S is not a gate rank
  const t = Number.isFinite(tier) ? Math.min(gates.length, Math.max(1, Math.round(tier))) : 1;
  return gates[t - 1].from;
}

/** First level of each rank, E..S. Single source for the rank gallery's "unlocks at level n". */
export const RANK_FROM: Readonly<Record<Rank, number>> = Object.fromEntries(BANDS.map(b => [b.rank, b.from])) as Record<Rank, number>;
export const RANKS: readonly Rank[] = BANDS.map(b => b.rank);

export function rankForLevel(level: number): Rank {
  let rank: Rank = 'E';
  for (const band of BANDS) if (level >= band.from) rank = band.rank;
  return rank;
}
