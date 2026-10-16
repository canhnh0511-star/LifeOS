import { Flame, Zap } from 'lucide-react';
import type { DailyDashboardDto, ItemDto } from '../api/types';
import { titleForLevel } from '../domain/rules';
import { RankBadge } from '../components/RankBadge';
import { InventoryPanel } from '../components/InventoryPanel';
import { CharacterCard } from '../components/CharacterCard';
import { ProgressBar } from '../components/primitives';
import { number, pct } from '../ui/format';

/** Who you are right now: level, per-area stats and the figure. Moved out of Today so Today can answer one question: what next? */
export function CharacterPage({ dashboard, items, busyItemCode, onEquip, onUnequip }: { dashboard: DailyDashboardDto | null; items: ItemDto[]; busyItemCode: string | null; onEquip: (item: ItemDto) => void; onUnequip: (item: ItemDto) => void }) {
  const cur = dashboard?.progress;
  const levelPct = cur ? pct(cur.totalXp - cur.levelStartXp, cur.nextLevelXp - cur.levelStartXp) : 0;
  return <>
    <div className="page-header"><div><div className="eyebrow"><span className="eyebrow-dash"/> NHÂN VẬT</div><h1>Bạn đang ở <span className="text-gradient">Level {cur?.level || 1}.</span></h1><p>XP của từng lĩnh vực quyết định chỉ số và level của bạn.</p></div></div>
    <div className="character-page">
      <article className="level-hero"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="hero-copy"><div className="hero-kicker"><Zap size={16} fill="currentColor"/> LEVEL {String(cur?.level || 1).padStart(2,'0')} · {titleForLevel(cur?.level || 1).toUpperCase()}</div><h2>Cứ xuất hiện mỗi ngày.<br/><span>Phần còn lại sẽ đến.</span></h2><div className="level-progress-title"><span>Tiến độ level</span><strong>{number(cur?.totalXp || 0)} <small>/ {number(cur?.nextLevelXp || 400)} XP</small></strong></div><ProgressBar value={levelPct}/><p>{number((cur?.nextLevelXp || 400) - (cur?.totalXp || 0))} XP nữa để lên Level {(cur?.level || 1)+1}</p></div><div className="hero-emblem"><div className="hero-emblem-ring"><RankBadge level={cur?.level || 1} size="lg"/></div><span>LEVEL {cur?.level || 1}</span></div></article>
      <CharacterCard areas={cur?.areas ?? []} totalXp={cur?.totalXp ?? 0}/>
      {items.length > 0 && <InventoryPanel items={items} busyCode={busyItemCode} onEquip={onEquip} onUnequip={onUnequip}/>}
      <div className="metric-grid metric-grid-2"><div className="metric-card"><span className="metric-icon orange"><Flame size={21}/></span><span className="metric-label">Chuỗi hiện tại</span><strong>{cur?.currentStreak || 0} <small>phiên</small></strong><span className="metric-foot">Chuỗi dài nhất của một thói quen đang chạy</span></div><div className="metric-card"><span className="metric-icon purple"><Zap size={21}/></span><span className="metric-label">Chuỗi kỷ lục</span><strong>{cur?.longestStreak || 0} <small>phiên</small></strong><span className="metric-foot">Dài nhất từ trước đến nay</span></div></div>
    </div>
  </>;
}
