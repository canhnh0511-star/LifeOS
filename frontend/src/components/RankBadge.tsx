import { rankForLevel } from '../domain/ranks';

const SIZE = { sm: 26, md: 38, lg: 76 } as const;

/** Shield with the rank letter. The letter is decorative; the accessible name is "Hạng C". */
export function RankBadge({ level, size = 'md', decorative = false }: { level: number; size?: 'sm' | 'md' | 'lg'; decorative?: boolean }) {
  const rank = rankForLevel(level);
  const px = SIZE[size];
  return <svg className={`rank-badge rank-${rank.toLowerCase()} rank-${size}`} width={px} height={px * 1.12} viewBox="0 0 50 56" {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': `Hạng ${rank}` })}>
    <polygon points="25,2 47,12 47,35 25,54 3,35 3,12" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
    <text x="25" y="35" textAnchor="middle" fontSize="26" fontWeight="900" fill="currentColor" aria-hidden="true">{rank}</text>
  </svg>;
}
