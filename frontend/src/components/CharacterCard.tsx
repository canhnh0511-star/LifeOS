import { useState } from 'react';
import type { AreaStatDto, GoalCategory } from '../api/types';
import { GEAR_NAMES, gearTier, type GearTier } from '../domain/characterGear';
import { categoryLabel } from '../domain/rules';
import { categoryColors, categoryIcons } from '../ui/categories';
import { number, pct } from '../ui/format';
import { CharacterModel } from './CharacterModel';
import { IconBubble, ProgressBar } from './primitives';

/** "Chỉ số nhân vật": the rotating wireframe figure plus the full per-area stat list. Hover either to link them. */
const PREVIEW_TIERS = [1, 2, 3, 4] as const;

export function CharacterCard({ areas, totalXp, allowPreview = false }: { areas: AreaStatDto[]; totalXp: number; allowPreview?: boolean }) {
  const [active, setActive] = useState<GoalCategory | null>(null);
  // Demo only: lets the viewer see every gear tier without playing for weeks. 'real' uses the actual area levels.
  const [preview, setPreview] = useState<GearTier | 'real'>('real');
  const override = allowPreview && preview !== 'real' ? preview : null;
  return <section className="panel character-card" aria-label="Chỉ số nhân vật">
    <div className="panel-head"><h3>Chỉ số nhân vật</h3><span className="subtle-text">Tổng {number(totalXp)} XP</span></div>
    <div className="character-layout">
      <div className="character-left">
        <CharacterModel areas={areas} active={active} onActive={setActive} tierOverride={override}/>
        {allowPreview && <div className="gear-preview" role="group" aria-label="Xem thử bậc trang bị (demo)">
          <span>Xem thử bậc trang bị</span>
          <button type="button" aria-pressed={preview === 'real'} onClick={() => setPreview('real')}>Thật</button>
          {PREVIEW_TIERS.map(t => <button type="button" key={t} aria-label={`Bậc ${t}`} aria-pressed={preview === t} onClick={() => setPreview(t)}>{t}</button>)}
        </div>}
      </div>
      <ul className="stat-list">{areas.map(a => {
        const Icon = categoryIcons[a.category];
        return <li key={a.category} className={`stat-row ${active === a.category ? 'is-active' : ''}`} onMouseEnter={() => setActive(a.category)} onMouseLeave={() => setActive(null)}>
          <IconBubble icon={Icon} tone={categoryColors[a.category]}/>
          <div className="stat-body"><div className="stat-top"><strong>{categoryLabel(a.category)}</strong><span>Lv {a.level} · {number(a.xp)} XP</span></div><ProgressBar value={pct(a.xp - a.levelStartXp, a.nextLevelXp - a.levelStartXp)} variant="green" size="slim"/><small>{GEAR_NAMES[a.category][(override ?? gearTier(a.level)) as 1 | 2 | 3 | 4]} · {number(a.nextLevelXp - a.xp)} XP nữa lên Lv {a.level + 1}</small></div>
        </li>;
      })}</ul>
    </div>
  </section>;
}
