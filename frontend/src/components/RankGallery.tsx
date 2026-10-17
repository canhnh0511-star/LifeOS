import { Lock } from 'lucide-react';
import { ALL_STAGES } from '../domain/characterStage';
import { RANK_FROM, rankForLevel } from '../domain/ranks';
import { RankBadge } from './RankBadge';
import { RankPortrait } from './RankPortrait';

/** How the hunter looks at each rank, E to S. Reached ranks are lit, the current one is marked, later ones are dimmed with the level that opens them. */
export function RankGallery({ level }: { level: number }) {
  const current = rankForLevel(level);
  return <ul className="rank-gallery" aria-label="Diện mạo theo hạng">
    {ALL_STAGES.map(stage => {
      const from = RANK_FROM[stage.rank], locked = level < from, here = stage.rank === current;
      return <li key={stage.rank} className={`rank-card ${locked ? 'is-locked' : ''} ${here ? 'is-current' : ''}`}>
        <RankPortrait level={from} size={132} locked={locked}/>
        <div className="rank-card-name"><RankBadge level={from} size="sm" decorative/><strong>{stage.name}</strong></div>
        <span className="rank-card-state">{here ? 'BẠN Ở ĐÂY' : locked ? <><Lock size={11} aria-hidden="true"/> MỞ Ở CẤP {from}</> : 'ĐÃ MỞ'}</span>
      </li>;
    })}
  </ul>;
}
