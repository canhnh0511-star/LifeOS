import { useEffect, useId, useRef, useState } from 'react';
import type { DailyRewardDto } from '../api/types';
import { useDialog } from '../hooks/useDialog';
import { tierName } from '../domain/dailyRewards';
import { ALL_CATEGORIES } from '../domain/insights';
import { categoryLabel } from '../domain/rules';
import { ITEM_CATALOG, RARITY_LABEL } from '../domain/items';
import { ItemArt } from './ItemArt';
import { ChestArt } from './ChestArt';

const SHAKE_MS = 650;
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const PARTICLES = Array.from({ length: 14 }, (_, i) => i);

/** Tap-to-open reward moment for an earned chest. The XP is already in the ledger; this reveals what the chest paid, per area. */
export function ChestOpening({ reward, onRevealed, onClose }: { reward: DailyRewardDto; onRevealed: () => void; onClose: () => void }) {
  const titleId = useId();
  const card = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(reducedMotion);
  // Escape cannot skip the shake: the chest only counts as opened once its reward was shown.
  useDialog(card, () => { if (revealed) onClose(); });
  const noteRevealed = useRef(onRevealed);
  noteRevealed.current = onRevealed;
  useEffect(() => { if (revealed) noteRevealed.current(); }, [revealed]);
  useEffect(() => {
    if (revealed) return;
    const timer = setTimeout(() => setRevealed(true), SHAKE_MS);
    return () => clearTimeout(timer);
  }, [revealed]);
  const each = reward.xp / ALL_CATEGORIES.length;
  const item = reward.itemCode ? ITEM_CATALOG.find(i => i.code === reward.itemCode) : undefined;
  return <div className={`chest-opening chest-${reward.tier.toLowerCase()}`} onMouseDown={e => { if (e.target === e.currentTarget && revealed) onClose(); }}>
    <div ref={card} className={`chest-opening-card ${revealed ? 'is-revealed' : 'is-opening'}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <div className="chest-box" aria-hidden="true">
        <ChestArt tier={reward.tier} open={revealed} size={150}/>
        {revealed && <span className="chest-burst">{PARTICLES.map(i => <i key={i} style={{ ['--a' as string]: `${i * (360 / PARTICLES.length)}deg` }}/>)}</span>}
      </div>
      <h2 id={titleId}>{revealed ? `${tierName(reward.tier)} đã mở!` : `Đang mở ${tierName(reward.tier)}…`}</h2>
      {revealed && <>
        <p className="chest-xp">+{reward.xp} XP</p>
        {item && <div className={`chest-item rarity-${item.rarity.toLowerCase()}`} aria-label={`Vật phẩm mới: ${item.name}`}>
          <ItemArt artKey={item.artKey} name={item.name}/>
          <div><span className="item-rarity">Vật phẩm mới · {RARITY_LABEL[item.rarity]}</span><strong>{item.name}</strong><small>{item.story}</small></div>
        </div>}
        <ul className="chest-areas" aria-label="XP theo lĩnh vực">{ALL_CATEGORIES.map(c => <li key={c}>{categoryLabel(c)} <strong>+{each}</strong></li>)}</ul>
      </>}
      <button className="btn btn-primary" onClick={onClose} disabled={!revealed}>Tiếp tục</button>
    </div>
  </div>;
}
