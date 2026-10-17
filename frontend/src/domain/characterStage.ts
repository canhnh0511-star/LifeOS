import { rankForLevel, type Rank } from './ranks';

/**
 * How the figure looks at each rank (B-28). Cosmetic only: derived from the level, stored nowhere, no XP or gameplay effect.
 * The stage follows `rankForLevel`, so there is one set of thresholds. Names and colours are this app's own.
 */
export interface CharacterStage { rank: Rank; name: string; /** "r,g,b" of the wireframe */ rgb: string; /** radii of the dashed rings on the ground */ rings: readonly number[]; /** portrait shown for this rank (served from /public) */ art: string; /** what the portrait shows, for the image's alt text */ look: string; }

const STAGES: Record<Rank, CharacterStage> = {
  E: { rank: 'E', name: 'Tân binh', rgb: '198,250,85', rings: [0.42, 0.62], art: '/art/ranks/rank-e.jpg', look: 'gầy, mệt mỏi, áo hoodie xám' },
  D: { rank: 'D', name: 'Thức tỉnh', rgb: '110,231,160', rings: [0.42, 0.62], art: '/art/ranks/rank-d.jpg', look: 'áo khoác đen cổ cao, giáp vai, ánh mắt tự tin' },
  C: { rank: 'C', name: 'Chiến binh', rgb: '90,200,255', rings: [0.42, 0.62, 0.8], art: '/art/ranks/rank-c.jpg', look: 'thân hình săn chắc, giáp gai' },
  B: { rank: 'B', name: 'Tinh nhuệ', rgb: '137,160,255', rings: [0.42, 0.62, 0.8], art: '/art/ranks/rank-b.jpg', look: 'cơ bắp rõ nét, giáp nặng, rồng xanh bắt đầu hiện' },
  A: { rank: 'A', name: 'Bậc thầy', rgb: '190,140,255', rings: [0.42, 0.62, 0.8, 0.98], art: '/art/ranks/rank-a.jpg', look: 'vạm vỡ, giáp hoàn chỉnh, rồng xanh bao quanh' },
  S: { rank: 'S', name: 'Huyền thoại', rgb: '244,196,91', rings: [0.42, 0.62, 0.8, 0.98], art: '/art/ranks/rank-s.jpg', look: 'rất mạnh, rồng xanh sau lưng' }
};

export function stageForLevel(level: number): CharacterStage { return STAGES[rankForLevel(level)]; }
export const ALL_STAGES: readonly CharacterStage[] = Object.values(STAGES);
