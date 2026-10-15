import { Award, Lock } from 'lucide-react';
import type { AchievementDto } from '../api/types';
import { formatDate } from '../domain/rules';

export function AchievementList({ achievements }: { achievements: AchievementDto[] }) {
  return <ul className="achievements">{achievements.map(a => {
    const earned = a.status === 'EARNED';
    return <li key={a.code} className={`achievement ${earned ? 'is-earned' : 'is-locked'}`}>
      <span className="achievement-icon" aria-hidden="true">{earned ? <Award size={22}/> : <Lock size={20}/>}</span>
      <div className="achievement-body">
        <strong>{a.name}</strong>
        <p>{a.description}</p>
        <small>{earned ? `Đã đạt${a.earnedAt ? ` ngày ${formatDate(a.earnedAt.slice(0, 10), { day: 'numeric', month: 'short' })}` : ''} · +${a.xpReward} XP` : `Chưa đạt · thưởng +${a.xpReward} XP`}</small>
      </div>
    </li>;
  })}</ul>;
}
