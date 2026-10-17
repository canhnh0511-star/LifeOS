import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { BadgeDto, DailyDashboardDto, HabitDto, ItemDto } from '../api/types';
import { BadgePanel } from '../components/BadgePanel';
import { InlinePanel } from '../components/InlinePanel';
import { InventoryPanel } from '../components/InventoryPanel';
import { RankGallery } from '../components/RankGallery';
import { RankPortrait } from '../components/RankPortrait';
import { StatRadar, type RadarStat } from '../components/StatRadar';
import { SysPanel } from '../components/SysPanel';
import { stageForLevel } from '../domain/characterStage';
import { viName } from '../domain/exerciseLibrary';
import { hunterStats, shadows, type HunterStats } from '../domain/hunterStats';
import { xpToNextRank } from '../domain/ranks';
import { moveDate } from '../domain/rules';
import { SHADOW_LOOK, shadowArt, shadowKind } from '../domain/shadowArt';
import { weekStart } from '../domain/week';
import { plannedWeek } from '../domain/weekProgress';
import type { DaySets } from '../domain/workoutStats';
import { ProgressBar } from '../components/primitives';
import { number, pct } from '../ui/format';

const STATS: { key: keyof HunterStats; label: string; short: string }[] = [
  { key: 'strength', label: 'Sức mạnh', short: 'Sức mạnh' }, { key: 'endurance', label: 'Sức bền cơ', short: 'Bền cơ' }, { key: 'volume', label: 'Khối lượng', short: 'Khối lượng' },
  { key: 'balance', label: 'Cân đối', short: 'Cân đối' }, { key: 'will', label: 'Ý chí', short: 'Ý chí' }
];

/** Who you are right now (designed "Cửa sổ trạng thái"): level and rank, the five gym stats and the shadows of your records. Never depends on the day picked on Today. */
export function CharacterPage({ dashboard, items, busyItemCode, onEquip, onUnequip, loadBadges, habits, today, loadHistory }: {
  dashboard: DailyDashboardDto | null; items: ItemDto[]; busyItemCode: string | null; onEquip: (item: ItemDto) => void; onUnequip: (item: ItemDto) => void;
  loadBadges?: () => Promise<BadgeDto[]>; habits: readonly HabitDto[]; today: string; loadHistory: () => Promise<DaySets[]>;
}) {
  const cur = dashboard?.progress;
  const [showRanks, setShowRanks] = useState(false);
  const [days, setDays] = useState<DaySets[] | null>(null);
  useEffect(() => { let alive = true; setDays(null); loadHistory().then(r => { if (alive) setDays(r); }).catch(() => { if (alive) setDays([]); }); return () => { alive = false; }; }, [loadHistory]);
  const level = cur?.level || 1, stage = stageForLevel(level), totalXp = cur?.totalXp ?? 0;
  const levelPct = cur ? pct(cur.totalXp - cur.levelStartXp, cur.nextLevelXp - cur.levelStartXp) : 0;
  const toNext = xpToNextRank(level, totalXp);
  const ws = weekStart(today);
  const stats = useMemo(() => days ? hunterStats(days, ws, plannedWeek(habits, ws).sessions) : null, [days, ws, habits]);
  const radar: RadarStat[] = STATS.map(s => ({ key: s.key, label: s.label, short: s.short, value: stats?.[s.key] ?? null }));
  const lowest = stats ? Math.min(...radar.flatMap(r => r.value === null ? [] : [r.value])) : null;
  const records = useMemo(() => days ? shadows(days).reverse() : [], [days]);
  const fresh = moveDate(today, -6);

  return <div className="character-page">
    <header className="sys-head"><span className="sys-eyebrow">NHÂN VẬT</span><h1>Cửa sổ trạng thái</h1></header>
    <SysPanel label="TRẠNG THÁI" tone="cyan" className="char-status">
      <div className="char-status-row">
        <RankPortrait level={level} size={104}/>
        <div className="char-status-body"><strong className="char-level">Cấp {level}</strong><span className="char-rank">HẠNG {stage.rank} · {stage.name.toUpperCase()}</span></div>
      </div>
      <ProgressBar value={levelPct}/>
      <p className="char-xp">{number(totalXp)} / {number(cur?.nextLevelXp ?? 400)} XP</p>
      <button type="button" className="char-ranks" aria-expanded={showRanks} onClick={() => setShowRanks(v => !v)}>
        <span>{toNext ? <>Còn {number(toNext.xp)} XP lên Hạng {toNext.rank} · xem diện mạo các hạng</> : <>Bạn đang ở hạng cao nhất · xem diện mạo các hạng</>}</span><ChevronRight size={16} aria-hidden="true"/>
      </button>
    </SysPanel>
    {showRanks && <InlinePanel title="Diện mạo theo hạng" eyebrow="HẠNG E → S" onClose={() => setShowRanks(false)}><RankGallery level={level}/></InlinePanel>}

    <SysPanel label="CHỈ SỐ" tone="cyan">
      <div className="char-stats">
        <StatRadar stats={radar}/>
        <ul aria-label="Chỉ số">{radar.map(r => <li key={r.key} className={r.value !== null && r.value === lowest ? 'is-low' : ''}><span>{r.label}</span><b>{r.value ?? '–'}</b></li>)}</ul>
      </div>
      <p className="char-note">So với 4 tuần gần nhất của chính bạn: bằng mức đó là 70. Dấu – là chưa đủ dữ liệu.</p>
    </SysPanel>

    <SysPanel label={`ĐỘI BÓNG · ${records.length} KỶ LỤC`} tone="purple">
      {!days ? <p className="form-note" role="status">Đang tải…</p> : records.length === 0
        ? <p className="form-note">Chưa có Bóng. Nâng mức tạ nặng nhất ở một bài để triệu hồi Bóng đầu tiên.</p>
        : <ul className="shadow-team">{records.slice(0, 6).map(r => <li key={`${r.exercise}-${r.date}`}>
          <img src={shadowArt(r.exercise)} alt={`${SHADOW_LOOK[shadowKind(r.exercise)]}, đại diện cho kỷ lục ${viName(r.exercise)}`} width="100" height="100" loading="lazy"/>
          {r.date >= fresh && <em>MỚI</em>}
          <strong>{viName(r.exercise)}</strong><span>{number(r.weightKg)} kg × {r.reps}</span></li>)}</ul>}
    </SysPanel>

    {loadBadges && <BadgePanel loadBadges={loadBadges} refreshKey={cur?.totalXp}/>}
    {items.length > 0 && <InventoryPanel items={items} busyCode={busyItemCode} onEquip={onEquip} onUnequip={onUnequip}/>}
  </div>;
}
