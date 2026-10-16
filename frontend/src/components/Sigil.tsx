/** Collectible sigil of a chapter: one original emblem per chapter, lit when its boss is defeated (the badge is earned). */
export function Sigil({ index, earned, size = 28 }: { index: number; earned: boolean; size?: number }) {
  const shape = [
    <circle key="a" cx="20" cy="20" r="6"/>,
    <polygon key="b" points="20,8 31,29 9,29"/>,
    <polygon key="c" points="20,6 33,20 20,34 7,20"/>,
    <polygon key="d" points="20,5 24,16 35,16 26,23 30,34 20,27 10,34 14,23 5,16 16,16"/>
  ][(Math.max(1, index) - 1) % 4];
  return <svg className={`sigil ${earned ? 'is-earned' : ''}`} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={earned ? undefined : '3 3'}/>
    <g fill="currentColor" fillOpacity={earned ? 0.9 : 0.25} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">{shape}</g>
  </svg>;
}
