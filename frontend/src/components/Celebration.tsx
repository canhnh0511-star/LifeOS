import { useEffect, useId, useRef } from 'react';
import { Award, Swords, Zap } from 'lucide-react';
import type { BossDto, GoalCategory } from '../api/types';
import { useDialog } from '../hooks/useDialog';
import type { LevelUps } from '../domain/levelUps';
import { RankBadge } from './RankBadge';
import { RankPortrait } from './RankPortrait';
import { stageForLevel } from '../domain/characterStage';
import { RANK_FROM } from '../domain/ranks';
import { categoryLabel, titleForLevel } from '../domain/rules';

export interface BossWin { boss: BossDto; xp: number; badgeName: string | null; }
export interface CelebrationData extends LevelUps { boss?: BossWin; }

/** Long enough to read; Escape, the button or a backdrop click closes sooner. */
const DISMISS_MS = 8000;

export const hasCelebration = (data: CelebrationData) => !!data.boss || data.level !== null || !!data.rank || data.areas.length > 0;

/** Full-screen reward moment, built as a real dialog (focus trap, Escape, focus restore); motion is off under prefers-reduced-motion. */
export function Celebration({ data, onClose }: { data: CelebrationData; onClose: () => void }) {
  const titleId = useId();
  const card = useRef<HTMLDivElement>(null);
  useDialog(card, onClose);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => { const timer = setTimeout(() => close.current(), DISMISS_MS); return () => clearTimeout(timer); }, [data]);

  const tier = data.boss?.boss.tier ?? 1;
  const title = data.boss ? `${data.boss.boss.name} bị hạ!` : data.rank ? 'LÊN HẠNG!' : data.level !== null ? 'LÊN CẤP!' : 'Chỉ số tăng cấp!';
  return <div className={`celebration tier-${tier}`} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="celebration-rays" aria-hidden="true"/>
    <div ref={card} className="celebration-card" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      {data.boss
        ? <img className="celebration-boss" src={`${import.meta.env.BASE_URL}bosses/${data.boss.boss.artKey}.jpg`} alt="" onError={e => { e.currentTarget.style.display = 'none'; }}/>
        : <span className="celebration-icon" aria-hidden="true"><Zap size={46} fill="currentColor"/></span>}
      <h2 id={titleId}>{data.boss && <Swords size={26} aria-hidden="true"/>} {title}</h2>
      {data.boss && <p className="celebration-big">+{data.boss.xp} XP</p>}
      {data.boss?.badgeName && <p className="celebration-line"><Award size={18} aria-hidden="true"/> Nhận {data.boss.badgeName}</p>}
      {data.rank && <div className="rank-change">
        <RankPortrait level={Math.max(1, RANK_FROM[data.rank] - 1)} size={92} locked/>
        <span className="rank-change-arrow" aria-hidden="true">»</span>
        <RankPortrait level={RANK_FROM[data.rank]} size={156}/>
      </div>}
      {data.rank && data.level !== null && <RankBadge level={data.level} size="lg"/>}
      {data.rank && <p className="celebration-line">Bạn đạt Hạng {data.rank}</p>}
      {data.rank && <p className="celebration-rank">Hạng {data.rank} · {stageForLevel(RANK_FROM[data.rank]).name}</p>}
      {data.rank && <ul className="celebration-unlocks" aria-label="Mở khoá">
        <li>Diện mạo nhân vật hạng {data.rank}</li>
        <li>Danh hiệu "{stageForLevel(RANK_FROM[data.rank]).name}"</li>
      </ul>}
      {data.level !== null && <p className={data.boss ? 'celebration-line' : 'celebration-big'}>Level {data.level} · {titleForLevel(data.level)}</p>}
      {data.areas.map(a => <p key={a.category} className="celebration-line">{categoryLabel(a.category as GoalCategory)} lên Lv {a.level}</p>)}
      <button className="btn btn-primary celebration-close" onClick={onClose}>Tiếp tục</button>
    </div>
  </div>;
}
