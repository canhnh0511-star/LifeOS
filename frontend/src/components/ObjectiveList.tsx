import { viName } from '../domain/exerciseLibrary';
import { useEffect, useState } from 'react';
import { Check, Circle, Info, Minus, Plus } from 'lucide-react';
import type { QuestDto, QuestObjectiveDto } from '../api/types';
import { ProgressBar } from './primitives';

/** A line with target 1 and no unit is a plain tick ("Ghi lại bữa ăn"); anything else is a counter ("Squat 24/40 rep"). */
export const isTick = (o: QuestObjectiveDto) => o.target === 1 && !o.unit;
export const metCount = (objectives: readonly QuestObjectiveDto[]) => objectives.filter(o => o.value >= o.target).length;

/**
 * The checklist of one quest. Taps update the numbers at once and each change is sent as an absolute value, so quick repeated taps are
 * never lost and a retry is harmless. The server decides when the whole quest is done.
 */
export function ObjectiveList({ quest, disabled = false, onSet, onInfo, hasInfo = () => true }: { quest: QuestDto; disabled?: boolean; onSet: (objective: QuestObjectiveDto, value: number) => void; /** given for lines that have a detail screen (library exercises) */ onInfo?: (objective: QuestObjectiveDto) => void; hasInfo?: (objective: QuestObjectiveDto) => boolean }) {
  const [local, setLocal] = useState<Record<string, number>>({});
  useEffect(() => { setLocal({}); }, [quest.objectives]); // fresh data from the server replaces what was typed
  const valueOf = (o: QuestObjectiveDto) => local[o.id] ?? o.value;
  const change = (o: QuestObjectiveDto, value: number) => {
    const next = Math.max(0, Math.min(100000, Math.round(value)));
    if (next === valueOf(o)) return;
    setLocal(v => ({ ...v, [o.id]: next }));
    onSet(o, next);
  };
  return <ul className="objective-list" aria-label={`Danh sách việc của ${quest.title}`}>
    {quest.objectives.map(o => {
      const value = valueOf(o), met = value >= o.target;
      if (isTick(o)) {
        return <li key={o.id} className={`objective ${met ? 'is-met' : ''}`}>
          <button type="button" role="checkbox" aria-checked={met} disabled={disabled} className="objective-tick" onClick={() => change(o, met ? 0 : 1)}>
            <span className={`quest-check ${met ? 'checked' : ''}`}>{met ? <Check size={15}/> : <Circle size={19}/>}</span><span className="objective-title">{viName(o.title)}</span>
          </button>
        </li>;
      }
      return <li key={o.id} className={`objective ${met ? 'is-met' : ''}`}>
        <div className="objective-head"><span className="objective-title">{met && <Check size={14} aria-hidden="true"/>} {viName(o.title)}</span>{onInfo && hasInfo(o) && <button type="button" className="objective-info" aria-label={`Kỹ thuật ${viName(o.title)}`} onClick={() => onInfo(o)}><Info size={16}/></button>}<span className="objective-count"><strong>{value}</strong> / {o.target} {o.unit}</span></div>
        <div className="objective-controls">
          <button type="button" aria-label={`Giảm ${viName(o.title)} ${o.step} ${o.unit}`} disabled={disabled || value <= 0} onClick={() => change(o, value - o.step)}><Minus size={16}/></button>
          <ProgressBar value={Math.min(100, Math.round(100 * value / o.target))} variant="green" size="slim"/>
          <button type="button" aria-label={`Tăng ${viName(o.title)} ${o.step} ${o.unit}`} disabled={disabled} onClick={() => change(o, value >= o.target ? value + o.step : Math.min(o.target, value + o.step))}><Plus size={16}/></button>
          <input key={value} type="number" inputMode="numeric" min={0} max={100000} defaultValue={value} disabled={disabled} aria-label={`Nhập tiến độ ${viName(o.title)}`}
            onBlur={e => { const n = Number(e.currentTarget.value); if (Number.isFinite(n)) change(o, n); else e.currentTarget.value = String(value); }}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}/>
        </div>
      </li>;
    })}
  </ul>;
}
