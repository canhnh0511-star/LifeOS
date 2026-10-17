import { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Clock3, Moon, Star } from 'lucide-react';
import type { DailyDashboardDto } from '../api/types';
import { formatDate, moveDate } from '../domain/rules';
import { WEEKDAY_SHORT, weekDates } from '../domain/week';
import { loadPin, pickMain } from '../ui/mainQuest';
import { Modal } from './Modal';

type Day = { state: 'loading' } | { state: 'error' } | { state: 'ok'; data: DailyDashboardDto };
interface Props { today: string; selectedDate: string; loadDay: (date: string) => Promise<DailyDashboardDto>; onPick: (date: string) => void; onClose: () => void; }

/**
 * The week at a glance (B-36): Monday to Sunday, one card per day with its sessions (or "Nghỉ"), the Main Quest marked.
 * Days after today are a preview only; a past day or today can be opened in the Today screen.
 */
export function WeekPlan({ today, selectedDate, loadDay, onPick, onClose }: Props) {
  const [anchor, setAnchor] = useState(selectedDate);
  const dates = weekDates(anchor);
  const [days, setDays] = useState<Record<string, Day>>({});
  useEffect(() => {
    let alive = true;
    setDays(Object.fromEntries(dates.map(d => [d, { state: 'loading' } as Day])));
    dates.forEach(d => loadDay(d).then(data => { if (alive) setDays(v => ({ ...v, [d]: { state: 'ok', data } })); }).catch(() => { if (alive) setDays(v => ({ ...v, [d]: { state: 'error' } })); }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates[0], loadDay]);
  const thisWeek = dates.includes(today);
  const total = dates.reduce((n, d) => { const x = days[d]; return n + (x?.state === 'ok' ? x.data.scheduledCount : 0); }, 0);
  const done = dates.reduce((n, d) => { const x = days[d]; return n + (x?.state === 'ok' ? x.data.completedCount : 0); }, 0);
  return <Modal title="Lịch tập tuần" onClose={onClose} sheet>
    <div className="wk">
      <div className="wk-nav">
        <button type="button" className="icon-btn" aria-label="Tuần trước" onClick={() => setAnchor(moveDate(dates[0], -7))}><ChevronLeft size={20}/></button>
        <div><strong>{formatDate(dates[0], { day: 'numeric', month: 'numeric', year: undefined })} – {formatDate(dates[6], { day: 'numeric', month: 'numeric', year: undefined })}</strong><small>{thisWeek ? 'Tuần này · ' : ''}{done}/{total} nhiệm vụ</small></div>
        <button type="button" className="icon-btn" aria-label="Tuần sau" onClick={() => setAnchor(moveDate(dates[0], 7))}><ChevronRight size={20}/></button>
      </div>
      <ul className="wk-days">{dates.map((d, i) => {
        const x = days[d], future = d > today, isToday = d === today;
        const quests = x?.state === 'ok' ? x.data.quests : [];
        const main = pickMain(quests, loadPin(d))?.habitId;
        const body = !x || x.state === 'loading' ? <small className="wk-note">Đang tải…</small>
          : x.state === 'error' ? <small className="wk-note" role="alert">Không tải được ngày này.</small>
          : quests.length === 0 ? <small className="wk-note"><Moon size={13}/> Nghỉ / hồi phục</small>
          : <ul className="wk-quests">{quests.map(q => <li key={q.habitId} className={q.status === 'COMPLETED' ? 'is-done' : ''}>
              {q.status === 'COMPLETED' ? <Check size={14} aria-label="Đã xong"/> : <Clock3 size={14} aria-hidden="true"/>}
              <span>{q.title}{main === q.habitId && <b className="wk-main"><Star size={11}/> Main Quest</b>}</span><small>{q.targetMinutes} phút</small></li>)}</ul>;
        return <li key={d} className={`wk-day${isToday ? ' is-today' : ''}${future ? ' is-future' : ''}`} aria-label={`${WEEKDAY_SHORT[i]} ${formatDate(d, { day: 'numeric', month: 'numeric', year: undefined })}${isToday ? ', hôm nay' : ''}`}>
          <div className="wk-date"><strong>{WEEKDAY_SHORT[i]}</strong><small>{formatDate(d, { day: 'numeric', month: 'numeric', year: undefined })}</small></div>
          <div className="wk-body">{body}</div>
          {!future && <button type="button" className="btn btn-quiet wk-open" onClick={() => onPick(d)} aria-label={`Mở ${WEEKDAY_SHORT[i]} ${formatDate(d, { day: 'numeric', month: 'numeric', year: undefined })}`}>Mở</button>}
          {future && <small className="wk-note">Xem trước</small>}
        </li>;
      })}</ul>
    </div>
  </Modal>;
}
