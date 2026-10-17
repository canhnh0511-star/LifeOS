import { useState } from 'react';
import { ArrowUpRight, Flame, Images, Zap } from 'lucide-react';
import type { BadgeDto, DailyDashboardDto, ItemDto } from '../api/types';
import { titleForLevel } from '../domain/rules';
import { RankBadge } from '../components/RankBadge';
import { InventoryPanel } from '../components/InventoryPanel';
import { BadgePanel } from '../components/BadgePanel';
import { CharacterCard } from '../components/CharacterCard';
import { InlinePanel } from '../components/InlinePanel';
import { RankGallery } from '../components/RankGallery';
import { RankPortrait } from '../components/RankPortrait';
import { stageForLevel } from '../domain/characterStage';
import { ProgressBar } from '../components/primitives';
import { nextLevelReward } from '../domain/nextReward';
import { number, pct } from '../ui/format';

/** Who you are right now: level, per-area stats and the figure. Moved out of Today so Today can answer one question: what next? */
export function CharacterPage({ dashboard, items, busyItemCode, onEquip, onUnequip, loadBadges }: { dashboard: DailyDashboardDto | null; items: ItemDto[]; busyItemCode: string | null; onEquip: (item: ItemDto) => void; onUnequip: (item: ItemDto) => void; loadBadges?: () => Promise<BadgeDto[]> }) {
  const cur = dashboard?.progress;
  const [showRanks, setShowRanks] = useState(false);
  const level = cur?.level || 1, stage = stageForLevel(level);
  const levelPct = cur ? pct(cur.totalXp - cur.levelStartXp, cur.nextLevelXp - cur.levelStartXp) : 0;
  return <>
    <div className="page-header"><div><div className="eyebrow"><span className="eyebrow-dash"/> NHÂN VẬT</div><h1>Bạn đang ở <span className="text-gradient">Level {cur?.level || 1}.</span></h1><p>XP của từng lĩnh vực quyết định chỉ số và level của bạn.</p></div></div>
    <div className="character-page">
      <article className="level-hero"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="hero-copy"><div className="hero-kicker"><Zap size={16} fill="currentColor"/> CẤP {String(cur?.level || 1).padStart(2,'0')} · {titleForLevel(cur?.level || 1).toUpperCase()}</div><h2>Cứ xuất hiện mỗi ngày.<br/><span>Phần còn lại sẽ đến.</span></h2><div className="level-progress-title"><span>Tiến độ level</span><strong>{number(cur?.totalXp || 0)} <small>/ {number(cur?.nextLevelXp || 400)} XP</small></strong></div><ProgressBar value={levelPct}/><p>{number((cur?.nextLevelXp || 400) - (cur?.totalXp || 0))} XP nữa để lên Level {(cur?.level || 1)+1}</p></div><div className="hero-emblem"><div className="hero-emblem-ring"><RankBadge level={cur?.level || 1} size="lg"/></div><span>CẤP {cur?.level || 1}</span></div></article>
      <section className="panel hunter-portrait" aria-label="Diện mạo hiện tại">
        <RankPortrait level={level} size={168}/>
        <div className="hunter-portrait-body"><span className="section-eyebrow">DIỆN MẠO HIỆN TẠI</span><h3>Hạng {stage.rank} · {stage.name}</h3><p>Diện mạo đổi mỗi khi bạn lên hạng.</p>
          <button type="button" className="btn btn-secondary" aria-expanded={showRanks} onClick={() => setShowRanks(v => !v)}><Images size={16}/> Diện mạo theo hạng</button></div>
      </section>
      {showRanks && <InlinePanel title="Diện mạo theo hạng" eyebrow="HẠNG E → S" onClose={() => setShowRanks(false)}><RankGallery level={level}/></InlinePanel>}
      {cur && <article className="panel next-reward" aria-label="Phần thưởng cấp kế tiếp">{(() => { const r = nextLevelReward(cur.level, cur.totalXp, cur.nextLevelXp); return <>
        <h3><ArrowUpRight size={17}/> Cấp kế tiếp · Cấp {r.level}</h3>
        <p>Còn <strong>{number(r.xpToGo)} XP</strong> nữa.</p>
        <ul>{r.rankUp && <li>Lên <strong>hạng {r.rankUp.rank} · {r.rankUp.name}</strong>: hình nhân vật đổi diện mạo.</li>}{r.newGearTier && <li>Mở trang bị bậc {r.newGearTier} cho hình nhân vật.</li>}{!r.rankUp && r.nextRank && <li>Hạng {r.nextRank.rank} · {r.nextRank.name} còn {r.levelsToNextRank} cấp nữa.</li>}{!r.rankUp && !r.newGearTier && !r.nextRank && <li>Bạn đã ở hạng cao nhất.</li>}</ul>
      </>; })()}</article>}
      <CharacterCard areas={cur?.areas ?? []} totalXp={cur?.totalXp ?? 0} level={cur?.level ?? 1}/>
      {loadBadges && <BadgePanel loadBadges={loadBadges} refreshKey={cur?.totalXp}/>}
      {items.length > 0 && <InventoryPanel items={items} busyCode={busyItemCode} onEquip={onEquip} onUnequip={onUnequip}/>}
      <div className="metric-grid metric-grid-2"><div className="metric-card"><span className="metric-icon orange"><Flame size={21}/></span><span className="metric-label">Chuỗi hiện tại</span><strong>{cur?.currentStreak || 0} <small>phiên</small></strong><span className="metric-foot">Chuỗi dài nhất của một thói quen đang chạy</span></div><div className="metric-card"><span className="metric-icon purple"><Zap size={21}/></span><span className="metric-label">Chuỗi kỷ lục</span><strong>{cur?.longestStreak || 0} <small>phiên</small></strong><span className="metric-foot">Dài nhất từ trước đến nay</span></div></div>
    </div>
  </>;
}
