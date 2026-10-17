import { useEffect, useState } from 'react';
import { Award, Lock } from 'lucide-react';
import type { BadgeDto } from '../api/types';
import { ProgressBar } from './primitives';

/** Training badges (B-29): each one shows its condition and how far along it is. Earned from real data, no XP. `refreshKey` reloads after a change. */
export function BadgePanel({ loadBadges, refreshKey }: { loadBadges: () => Promise<BadgeDto[]>; refreshKey?: unknown }) {
  const [badges, setBadges] = useState<BadgeDto[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true; setFailed(false);
    loadBadges().then(b => { if (alive) setBadges(b); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [loadBadges, refreshKey]);
  if (failed) return <section className="panel badge-panel" aria-label="Huy hiệu tập luyện"><h3>Huy hiệu tập luyện</h3><p role="alert" className="set-error">Không tải được huy hiệu.</p></section>;
  if (!badges) return null;
  return <section className="panel badge-panel" aria-label="Huy hiệu tập luyện">
    <div className="panel-head"><h3>Huy hiệu tập luyện</h3><span className="subtle-text">{badges.filter(b => b.earned).length}/{badges.length} · từ buổi tập và set bạn đã ghi, không cộng XP</span></div>
    <ul className="badge-list">{badges.map(b => <li key={b.code} className={`badge-item${b.earned ? ' is-earned' : ''}`}>
      <span className="badge-icon" aria-hidden="true">{b.earned ? <Award size={22}/> : <Lock size={20}/>}</span>
      <span className="badge-body"><strong>{b.name}</strong><small>{b.description}</small>
        {b.earned ? <small className="badge-state">Đã đạt</small> : <><ProgressBar value={Math.round(100 * b.progress / b.target)} variant="green" size="slim"/><small className="badge-state">{b.progress}/{b.target}</small></>}</span>
    </li>)}</ul>
  </section>;
}
