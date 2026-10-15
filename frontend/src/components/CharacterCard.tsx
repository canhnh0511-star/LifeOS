import { useState } from 'react';
import type { AreaStatDto, GoalCategory } from '../api/types';
import { categoryLabel } from '../domain/rules';
import { categoryColors, categoryIcons } from '../ui/categories';
import { number, pct } from '../ui/format';
import { CharacterModel } from './CharacterModel';
import { IconBubble, ProgressBar } from './primitives';

/** "Chỉ số nhân vật": the rotating wireframe figure plus the full per-area stat list. Hover either to link them. */
export function CharacterCard({ areas, totalXp }: { areas: AreaStatDto[]; totalXp: number }) {
  const [active, setActive] = useState<GoalCategory | null>(null);
  return <section className="panel character-card" aria-label="Chỉ số nhân vật">
    <div className="panel-head"><h3>Chỉ số nhân vật</h3><span className="subtle-text">Tổng {number(totalXp)} XP</span></div>
    <div className="character-layout">
      <CharacterModel areas={areas} active={active} onActive={setActive}/>
      <ul className="stat-list">{areas.map(a => {
        const Icon = categoryIcons[a.category];
        return <li key={a.category} className={`stat-row ${active === a.category ? 'is-active' : ''}`} onMouseEnter={() => setActive(a.category)} onMouseLeave={() => setActive(null)}>
          <IconBubble icon={Icon} tone={categoryColors[a.category]}/>
          <div className="stat-body"><div className="stat-top"><strong>{categoryLabel(a.category)}</strong><span>Lv {a.level} · {number(a.xp)} XP</span></div><ProgressBar value={pct(a.xp - a.levelStartXp, a.nextLevelXp - a.levelStartXp)} variant="green" size="slim"/><small>{number(a.nextLevelXp - a.xp)} XP nữa lên Lv {a.level + 1}</small></div>
        </li>;
      })}</ul>
    </div>
  </section>;
}
