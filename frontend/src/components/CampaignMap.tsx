import { useState } from 'react';
import { Check, Lock, Swords, Undo2 } from 'lucide-react';
import type { BossDto, ChapterDto } from '../api/types';
import { Sigil } from './Sigil';
import { RankBadge } from './RankBadge';
import { gateRank } from '../domain/ranks';
import { categoryLabel, diffDays, formatDate, todayInTimezone } from '../domain/rules';

const TIER_NAMES = ['', 'Minion', 'Elite', 'Champion', 'Legend', 'Mythic'];

function BossArt({ boss }: { boss: BossDto }) {
  const [failed, setFailed] = useState(false);
  return <div className={`boss-art tier-${boss.tier} ${boss.status === 'LOCKED' ? 'is-locked' : ''}`}>
    {failed ? <Swords size={44} aria-hidden="true"/> : <img src={`${import.meta.env.BASE_URL}bosses/${boss.artKey}.jpg`} alt={`Hình quái vật ${boss.name}`} onError={() => setFailed(true)}/>}
    {boss.status === 'LOCKED' && <span className="boss-lock"><Lock size={22} aria-hidden="true"/></span>}
  </div>;
}

interface Props { chapters: ChapterDto[]; busyBossId: string | null; onDefeat: (boss: BossDto) => void; onUndo: (boss: BossDto) => void; }

export function CampaignMap({ chapters, busyBossId, onDefeat, onUndo }: Props) {
  const today = todayInTimezone();
  const earned = chapters.filter(c => c.badge.earned).length;
  return <>
  <section className="sigil-shelf" aria-label="Bộ sưu tập ấn ký"><strong>Ấn ký {earned}/{chapters.length}</strong><ul>{chapters.map(c => <li key={c.index} className={c.badge.earned ? 'is-earned' : ''}><Sigil index={c.index} earned={c.badge.earned} size={34}/><span className="sr-only">{c.badge.name}: {c.badge.earned ? 'đã nhận' : `chưa nhận, hạ boss ở Cửa ải ${c.index}`}</span></li>)}</ul></section>
  <ol className="campaign" aria-label="Bản đồ cửa ải">{chapters.map(chapter => {
    const { boss, badge } = chapter;
    const phase = today > chapter.endDate ? 'past' : today >= chapter.startDate ? 'current' : 'future';
    const busy = busyBossId === boss.id;
    return <li key={chapter.index} className={`chapter chapter-${phase}`}>
      <div className="chapter-head"><span className="chapter-index">Cửa ải {chapter.index}</span><span className="gate-rank"><RankBadge level={gateRank(boss.tier)} size="sm"/><span className="sr-only">độ khó</span></span><h3>{chapter.title}</h3><span className={`chapter-badge ${badge.earned ? 'is-earned' : ''}`} title={badge.earned ? 'Đã nhận huy hiệu' : 'Hạ boss để nhận huy hiệu'}><Sigil index={chapter.index} earned={badge.earned} size={20}/> {badge.name}<span className="sr-only">{badge.earned ? ' (đã nhận)' : ' (chưa nhận)'}</span></span><small>{formatDate(chapter.startDate, { day: 'numeric', month: 'short' })} – {formatDate(chapter.endDate, { day: 'numeric', month: 'short' })}{phase === 'current' && ` · đang diễn ra, ngày ${diffDays(chapter.startDate, today) + 1}/${diffDays(chapter.startDate, chapter.endDate) + 1}`}</small></div>
      <article className={`boss-card status-${boss.status.toLowerCase()}`} aria-label={`Boss ${boss.name}`}>
        <BossArt boss={boss}/>
        <div className="boss-body">
          <span className="boss-tier">Tier {boss.tier} · {TIER_NAMES[boss.tier]}</span>
          <h4>{boss.name}</h4>
          <p>{categoryLabel(boss.category)} · {boss.targetMinutes} phút · <strong>+{boss.xpReward} XP</strong></p>
          {boss.status === 'LOCKED' && <p className="boss-hint">Cần {categoryLabel(boss.category)} đạt Lv {boss.requiredLevel} (hiện Lv {boss.currentAreaLevel}).</p>}
          {boss.status === 'DEFEATED' && <p className="boss-hint boss-win"><Check size={14} aria-hidden="true"/> Đã hạ ngày {boss.defeatedDate && formatDate(boss.defeatedDate, { day: 'numeric', month: 'short' })}</p>}
          {boss.status === 'AVAILABLE' && <button className="btn btn-primary" disabled={busy} onClick={() => onDefeat(boss)}><Swords size={16}/> Đã hoàn thành thử thách</button>}
          {boss.status === 'DEFEATED' && <button className="btn btn-quiet" disabled={busy} onClick={() => onUndo(boss)}><Undo2 size={16}/> Hoàn tác</button>}
        </div>
      </article>
    </li>;
  })}</ol>
  </>;
}
