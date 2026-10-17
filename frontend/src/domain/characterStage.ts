import { rankForLevel, type Rank } from './ranks';

/**
 * How the figure looks at each rank (B-28). Cosmetic only: derived from the level, stored nowhere, no XP or gameplay effect.
 * The stage follows `rankForLevel`, so there is one set of thresholds. Names and colours are this app's own.
 */
export interface CharacterStage { rank: Rank; name: string; /** "r,g,b" of the wireframe */ rgb: string; /** radii of the dashed rings on the ground */ rings: readonly number[]; }

const STAGES: Record<Rank, CharacterStage> = {
  E: { rank: 'E', name: 'Tân binh', rgb: '198,250,85', rings: [0.42, 0.62] },
  D: { rank: 'D', name: 'Thức tỉnh', rgb: '110,231,160', rings: [0.42, 0.62] },
  C: { rank: 'C', name: 'Tiên phong', rgb: '90,200,255', rings: [0.42, 0.62, 0.8] },
  B: { rank: 'B', name: 'Chiến tướng', rgb: '137,160,255', rings: [0.42, 0.62, 0.8] },
  A: { rank: 'A', name: 'Bậc thầy', rgb: '190,140,255', rings: [0.42, 0.62, 0.8, 0.98] },
  S: { rank: 'S', name: 'Huyền thoại', rgb: '244,196,91', rings: [0.42, 0.62, 0.8, 0.98] }
};

export function stageForLevel(level: number): CharacterStage { return STAGES[rankForLevel(level)]; }
export const ALL_STAGES: readonly CharacterStage[] = Object.values(STAGES);
