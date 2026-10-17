import { stageForLevel } from '../domain/characterStage';

/**
 * The hunter's portrait for the rank that `level` falls in. Cosmetic only (derived from the level, nothing stored).
 * `locked` dims it for a rank that is not reached yet. Source art is small, so keep `size` at or below ~200 CSS px.
 */
export function RankPortrait({ level, size = 120, locked = false }: { level: number; size?: number; locked?: boolean }) {
  const stage = stageForLevel(level);
  return <span className={`rank-portrait rank-${stage.rank.toLowerCase()} ${locked ? 'is-locked' : ''}`} style={{ width: size, height: size }}>
    <img src={stage.art} width={size} height={size} alt={`Hạng ${stage.rank}: ${stage.look}`} loading="lazy" decoding="async"/>
  </span>;
}
