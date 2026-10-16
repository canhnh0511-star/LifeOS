import { CalendarDays, Check, ChevronLeft, ChevronRight, Circle, Clock3, Flame, PartyPopper, Plus, Zap } from 'lucide-react';
import type { DailyDashboardDto, QuestDto, QuestObjectiveDto } from '../api/types';
import { categoryLabel, formatDate, moveDate, titleForLevel } from '../domain/rules';
import { ObjectiveList, metCount } from '../components/ObjectiveList';
import { EmptyState, IconBubble, ProgressBar } from '../components/primitives';
import { categoryColors, categoryIcons } from '../ui/categories';
import { dateText, pct } from '../ui/format';
import type { Tab } from '../ui/nav';

interface Props {
  dashboard: DailyDashboardDto | null;
  selectedDate: string; today: string; busyId: string | null;
  onSelectDate: (update: (date: string) => string) => void;
  onToggleQuest: (quest: QuestDto) => void; onSetObjective: (quest: QuestDto, objective: QuestObjectiveDto, value: number) => void; onNewHabit: () => void; goTo: (tab: Tab) => void;
}

/**
 * Today answers one question: what do I do next? A one-line summary, the next quest with a single button, then the full list.
 * Level, stats, balance and the campaign live in their own tabs.
 */
export function TodayPage({ dashboard, selectedDate, today, busyId, onSelectDate, onToggleQuest, onSetObjective, onNewHabit, goTo }: Props) {
  const cur = dashboard?.progress;
  const total = dashboard?.scheduledCount || 0, done = dashboard?.completedCount || 0;
  const dayPct = pct(done, total);
  const isToday = selectedDate === today;
  const next = isToday ? dashboard?.quests.find(q => q.status === 'PENDING') : undefined;
  const allDone = isToday && total > 0 && !next;
  const NextIcon = next ? categoryIcons[next.category] : null;
  return <>
    <div className="page-header today-banner"><div><h1>{isToday ? <>Hôm <span className="text-gradient">nay</span></> : <span className="text-gradient">Ngày đã chọn</span>}</h1><p>{dateText(selectedDate)} · {total === 0 ? 'chưa có nhiệm vụ nào' : `${done}/${total} nhiệm vụ đã xong`}</p></div><button className="btn btn-outlined" onClick={onNewHabit}><Plus size={17}/> Thói quen mới</button></div>
    <div className="today-simple">
      <div className="today-summary" aria-label="Tóm tắt hôm nay">
        <div className="today-progress"><div className="today-progress-top"><span>Tiến độ trong ngày</span><strong>{done}/{total}</strong></div><ProgressBar value={dayPct} variant="green" size="slim"/></div>
        <div className="today-chip" title="Chuỗi dài nhất hiện tại của một thói quen"><Flame size={18}/><strong>{cur?.currentStreak || 0}</strong><span>phiên liền</span></div>
        <div className="today-chip"><Zap size={18}/><strong>+{dashboard?.earnedXpToday || 0}</strong><span>{isToday ? 'XP hôm nay' : 'XP ngày này'}</span></div>
        <button className="today-chip today-level" onClick={() => goTo('character')} aria-label={`Level ${cur?.level || 1}, xem nhân vật`}><strong>Lv {cur?.level || 1}</strong><span>{titleForLevel(cur?.level || 1)}</span></button>
      </div>

      {next && NextIcon && <article className="next-up" aria-label="Việc tiếp theo">
        <div className="next-up-label">VIỆC TIẾP THEO</div>
        <div className="next-up-main"><IconBubble icon={NextIcon} tone={categoryColors[next.category]}/><div><h2>{next.title}</h2><small><Clock3 size={13}/> {next.targetMinutes} phút · {categoryLabel(next.category)} · +{next.xpReward} XP{next.objectives.length > 0 && ` · ${metCount(next.objectives)}/${next.objectives.length} việc`}</small></div></div>
        {next.objectives.length > 0
          ? <>
              <ObjectiveList quest={next} onSet={(o, v) => onSetObjective(next, o, v)}/>
              <button className="btn btn-quiet next-up-quick" disabled={busyId === next.habitId} onClick={() => onToggleQuest(next)}><Check size={16}/> Đánh dấu xong tất cả</button>
            </>
          : <button className="btn btn-primary" disabled={busyId === next.habitId} onClick={() => onToggleQuest(next)}><Check size={17}/> Hoàn thành</button>}
      </article>}
      {allDone && <article className="next-up next-up-done" aria-label="Đã xong hôm nay">
        <div className="next-up-main"><PartyPopper size={28}/><div><h2>Bạn đã hoàn thành hết hôm nay.</h2><small>Nghỉ ngơi, hoặc xem nhân vật của bạn tiến bộ thế nào.</small></div></div>
        <button className="btn btn-secondary" onClick={() => goTo('character')}>Xem nhân vật</button>
      </article>}

      <article className="panel quests-panel">
        <div className="quests-header"><div><h2>Tất cả nhiệm vụ <span className="count-pill">{total}</span></h2></div>
          <div className="date-controls"><button aria-label="Ngày trước" onClick={() => onSelectDate(d => moveDate(d, -1))}><ChevronLeft size={17}/></button><span>{isToday ? 'Hôm nay' : formatDate(selectedDate, { day: 'numeric', month: 'short' })}</span><button disabled={selectedDate >= today} aria-label="Ngày tiếp theo" onClick={() => onSelectDate(d => moveDate(d, 1))}><ChevronRight size={17}/></button></div></div>
        <div className="quest-list">{!dashboard?.quests.length
          ? <EmptyState icon={CalendarDays} title="Không có nhiệm vụ trong ngày này" details="Tạo một thói quen mới hoặc chọn ngày khác." action={<button className="btn btn-secondary" onClick={onNewHabit}><Plus size={16}/> Tạo thói quen</button>}/>
          : dashboard.quests.map(q => {
            const Icon = categoryIcons[q.category]; const completed = q.status === 'COMPLETED';
            if (q.objectives.length > 0) {
              // A quest with a checklist is a card, not one big button: its lines are the controls.
              return <div key={q.habitId} className={`quest-card ${completed ? 'is-done' : ''} ${next?.habitId === q.habitId ? 'is-next' : ''}`}>
                <div className="quest-card-head"><IconBubble icon={Icon} tone={categoryColors[q.category]}/><span className="quest-body"><strong>{q.title}</strong><small><Clock3 size={13}/> {q.targetMinutes} phút <i/> {categoryLabel(q.category)} <i/> {metCount(q.objectives)}/{q.objectives.length} việc</small></span><span className={`xp-tag ${completed ? 'earned' : ''}`}>{completed ? <Check size={13}/> : <Zap size={13}/>} {completed ? 'Xong' : `+${q.xpReward} XP`}</span></div>
                {next?.habitId !== q.habitId && <ObjectiveList quest={q} onSet={(o, v) => onSetObjective(q, o, v)}/>}
              </div>;
            }
            return <button key={q.habitId} className={`quest-row ${completed ? 'is-done' : ''} ${next?.habitId === q.habitId ? 'is-next' : ''}`} aria-label={`${completed ? 'Hoàn tác' : 'Hoàn thành'} nhiệm vụ ${q.title}, ${q.xpReward} XP`} aria-pressed={completed} disabled={busyId === q.habitId} onClick={() => onToggleQuest(q)}>
              <span className={`quest-check ${completed ? 'checked' : ''}`}>{completed ? <Check size={17}/> : <Circle size={19}/>}</span>
              <IconBubble icon={Icon} tone={categoryColors[q.category]}/>
              <span className="quest-body"><strong>{q.title}</strong><small><Clock3 size={13}/> {q.targetMinutes} phút <i/> {categoryLabel(q.category)}</small></span>
              <span className={`xp-tag ${completed ? 'earned' : ''}`}>{completed ? <Check size={13}/> : <Zap size={13}/>} {completed ? 'Xong' : `+${q.xpReward} XP`}</span>
            </button>;
          })}</div>
      </article>
    </div>
  </>;
}
