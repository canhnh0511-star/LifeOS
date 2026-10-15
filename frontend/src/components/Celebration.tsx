import { useEffect, useRef } from 'react';
import { Swords, Zap } from 'lucide-react';
import type { BossDto } from '../api/types';
import { titleForLevel } from '../domain/rules';

export type CelebrationData =
  | { kind: 'level'; level: number }
  | { kind: 'boss'; boss: BossDto; xp: number; levelUp: number | null };

const DISMISS_MS = 4500;

/** Full-screen reward moment. Click, Escape or a timeout closes it; motion is disabled by prefers-reduced-motion in CSS. */
export function Celebration({ data, onClose }: { data: CelebrationData; onClose: () => void }) {
  const close = useRef(onClose);
  close.current = onClose; // parent re-renders must not restart the dismiss timer
  useEffect(() => {
    const timer = setTimeout(() => close.current(), DISMISS_MS);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(timer); document.removeEventListener('keydown', onKey); };
  }, [data]);

  const tier = data.kind === 'boss' ? data.boss.tier : 1;
  return <div className={`celebration tier-${tier}`} role="status" aria-live="polite" onClick={onClose}>
    <div className="celebration-rays" aria-hidden="true"/>
    <div className="celebration-card">
      {data.kind === 'level' ? <>
        <span className="celebration-icon"><Zap size={46} fill="currentColor" aria-hidden="true"/></span>
        <h2>LEVEL UP!</h2>
        <p className="celebration-big">Level {data.level}</p>
        <p>{titleForLevel(data.level)}</p>
      </> : <>
        <img className="celebration-boss" src={`${import.meta.env.BASE_URL}bosses/${data.boss.artKey}.jpg`} alt="" onError={e => { e.currentTarget.style.display = 'none'; }}/>
        <h2><Swords size={26} aria-hidden="true"/> {data.boss.name} bị hạ!</h2>
        <p className="celebration-big">+{data.xp} XP</p>
        {data.levelUp !== null && <p>Lên Level {data.levelUp} · {titleForLevel(data.levelUp)}</p>}
      </>}
      <small>Nhấn để đóng</small>
    </div>
  </div>;
}

/** The overall level the user just reached, or null when it did not go up. */
export function levelReached(previous: number | undefined, next: number): number | null {
  return previous !== undefined && next > previous ? next : null;
}
