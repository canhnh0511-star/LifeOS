import { rankForLevel, type Rank } from './ranks';

/**
 * How the figure looks at each rank (B-28). Cosmetic only: derived from the level, stored nowhere, no XP or gameplay effect.
 * The stage follows `rankForLevel`, so there is one set of thresholds. Names and colours are this app's own.
 */
export interface CharacterStage { rank: Rank; name: string; /** "r,g,b" of the wireframe */ rgb: string; /** radii of the dashed rings on the ground */ rings: readonly number[]; /** portrait shown for this rank (served from /public) */ art: string; /** what the portrait shows, for the image's alt text */ look: string; }

const STAGES: Record<Rank, CharacterStage> = {
  E: { rank: 'E', name: 'Tân binh', rgb: '198,250,85', rings: [0.42, 0.62], art: '/art/ranks/rank-e.jpg', look: 'áo rách, tay quấn băng, đứng giữa tàn tích dưới mưa' },
  D: { rank: 'D', name: 'Thức tỉnh', rgb: '110,231,160', rings: [0.42, 0.62], art: '/art/ranks/rank-d.jpg', look: 'giáp đen có gai, cầm kiếm, rồng xanh lục dưới ánh trăng' },
  C: { rank: 'C', name: 'Chiến binh', rgb: '90,200,255', rings: [0.42, 0.62, 0.8], art: '/art/ranks/rank-c.jpg', look: 'giáp đen khăn xanh, tư thế chiến đấu, rồng băng' },
  B: { rank: 'B', name: 'Tinh nhuệ', rgb: '137,160,255', rings: [0.42, 0.62, 0.8], art: '/art/ranks/rank-b.jpg', look: 'giáp đầy đủ, kiếm trong tay, lơ lửng giữa lâu đài tím, rồng tím khổng lồ' },
  A: { rank: 'A', name: 'Bậc thầy', rgb: '190,140,255', rings: [0.42, 0.62, 0.8, 0.98], art: '/art/ranks/rank-a.jpg', look: 'giáp vai và tay, kiếm bên hông, rồng lửa vàng, hoàng hôn' },
  S: { rank: 'S', name: 'Huyền thoại', rgb: '244,196,91', rings: [0.42, 0.62, 0.8, 0.98], art: '/art/ranks/rank-s.jpg', look: 'áo choàng gai, rồng đỏ, hố đen và lâu đài lơ lửng' }
};

export function stageForLevel(level: number): CharacterStage { return STAGES[rankForLevel(level)]; }
export const ALL_STAGES: readonly CharacterStage[] = Object.values(STAGES);
