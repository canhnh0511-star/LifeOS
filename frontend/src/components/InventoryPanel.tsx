import { useState } from 'react';
import { Lock } from 'lucide-react';
import type { ItemDto, ItemSlot } from '../api/types';
import { RARITY_LABEL, SLOT_LABEL } from '../domain/items';
import { categoryLabel } from '../domain/rules';
import { ItemArt } from './ItemArt';

const SLOTS: ItemSlot[] = ['WEAPON', 'HEAD', 'CLOAK', 'FEET', 'RELIC'];

interface Props { items: ItemDto[]; busyCode: string | null; onEquip: (item: ItemDto) => void; onUnequip: (item: ItemDto) => void; }

/** Equipment slots and the collection of items dropped by daily chests. Items change how the hero looks; they never give XP. */
export function InventoryPanel({ items, busyCode, onEquip, onUnequip }: Props) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const selected = items.find(i => i.code === selectedCode) ?? null;
  const ownedCount = items.filter(i => i.owned).length;
  return <section className="panel inventory" aria-label="Kho đồ">
    <div className="panel-head"><h3>Trang bị &amp; kho đồ</h3><span className="subtle-text">Sưu tập {ownedCount}/{items.length} · mở rương để nhận đồ</span></div>
    <ul className="equip-slots" aria-label="Ô trang bị">{SLOTS.map(slot => {
      const worn = items.find(i => i.slot === slot && i.equipped);
      return <li key={slot} className={`equip-slot ${worn ? `rarity-${worn.rarity.toLowerCase()}` : ''}`}>
        {worn ? <button className="equip-slot-btn" aria-label={`${SLOT_LABEL[slot]}: đang đeo ${worn.name}`} onClick={() => setSelectedCode(worn.code)}><ItemArt artKey={worn.artKey} name={worn.name}/></button> : <span className="equip-slot-empty" aria-label={`${SLOT_LABEL[slot]}: trống`}/>}
        <small>{SLOT_LABEL[slot]}</small>
      </li>;
    })}</ul>
    <ul className="item-grid" aria-label="Bộ sưu tập vật phẩm">{items.map(item => <li key={item.code}>
      <button className={`item-card rarity-${item.rarity.toLowerCase()} ${item.owned ? '' : 'is-locked'} ${selectedCode === item.code ? 'is-selected' : ''}`}
        aria-label={item.owned ? `${item.name}, ${RARITY_LABEL[item.rarity]}${item.equipped ? ', đang đeo' : ''}` : `Chưa sở hữu: ${item.name}`} aria-pressed={selectedCode === item.code} onClick={() => setSelectedCode(item.code)}>
        <ItemArt artKey={item.artKey} name={item.name}/>
        {!item.owned && <span className="item-lock"><Lock size={18} aria-hidden="true"/></span>}
        {item.equipped && <span className="item-worn">Đang đeo</span>}
      </button>
    </li>)}</ul>
    {selected && <article className={`item-detail rarity-${selected.rarity.toLowerCase()}`} aria-label={`Chi tiết ${selected.name}`}>
      <ItemArt artKey={selected.artKey} name={selected.name}/>
      <div className="item-detail-body">
        <span className="item-rarity">{RARITY_LABEL[selected.rarity]} · {SLOT_LABEL[selected.slot]} · {categoryLabel(selected.area)}</span>
        <h4>{selected.name}</h4>
        <p>{selected.story}</p>
        {selected.owned
          ? <>{selected.acquiredDate && <small>Nhận ngày {selected.acquiredDate}</small>}
              {selected.equipped
                ? <button className="btn btn-quiet" disabled={busyCode === selected.code} onClick={() => onUnequip(selected)}>Tháo ra</button>
                : <button className="btn btn-primary" disabled={busyCode === selected.code} onClick={() => onEquip(selected)}>Đeo vào</button>}</>
          : <small>Chưa sở hữu. Món này có thể rơi từ rương hằng ngày.</small>}
      </div>
    </article>}
  </section>;
}
