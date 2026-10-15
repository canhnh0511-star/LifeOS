import { ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCheck, CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock3, Flame, Plus, Target, Zap } from 'lucide-react';
import type { AnalyticsDto, DailyDashboardDto, QuestDto } from '../api/types';
import { categoryLabel, formatDate, moveDate, titleForLevel } from '../domain/rules';
import { radarAxes } from '../domain/insights';
import { CardTitle, CircleProgress, EmptyState, IconBubble, ProgressBar } from '../components/primitives';
import { RadarChart } from '../components/RadarChart';
import { categoryColors, categoryIcons } from '../ui/categories';
import { dateText, number, pct } from '../ui/format';
import type { Tab } from '../ui/nav';

interface Props {
  dashboard: DailyDashboardDto | null; weekly: AnalyticsDto | null;
  selectedDate: string; today: string; busyId: string | null;
  onSelectDate: (update: (date: string) => string) => void;
  onToggleQuest: (quest: QuestDto) => void; onNewHabit: () => void; goTo: (tab: Tab) => void;
}

export function TodayPage({ dashboard, weekly, selectedDate, today, busyId, onSelectDate, onToggleQuest, onNewHabit, goTo }: Props) {
  const cur = dashboard?.progress;
  const journey = dashboard?.journey;
  const dayPct = pct(dashboard?.completedCount || 0, dashboard?.scheduledCount || 0);
  const levelPct = cur ? pct(cur.totalXp - cur.levelStartXp, cur.nextLevelXp - cur.levelStartXp) : 0;
  const journeyPct = journey ? pct(journey.elapsedDays, journey.durationDays) : 0;
  const journeyDonePct = journey ? pct(journey.completedToDate, journey.totalScheduledToDate) : 0;
  return <>
            <div className="page-header"><div><div className="eyebrow"><span className="eyebrow-dash"/> YOUR DAILY COMMAND CENTER</div><h1>Make today <span className="text-gradient">count.</span></h1><p>Mỗi hành động nhỏ là một bước tiến dài trên hành trình của bạn.</p></div><button className="btn btn-outlined" onClick={onNewHabit}><Plus size={17}/> Thói quen mới</button></div>
            <div className="main-grid">
              <section className="primary-column">
                <article className="level-hero"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="hero-copy"><div className="hero-kicker"><Zap size={16} fill="currentColor"/> LEVEL {String(cur?.level || 1).padStart(2,'0')} · {titleForLevel(cur?.level || 1).toUpperCase()}</div><h2>Keep showing up.<br/><span>The rest will follow.</span></h2><div className="level-progress-title"><span>Level progress</span><strong>{number(cur?.totalXp || 0)} <small>/ {number(cur?.nextLevelXp || 400)} XP</small></strong></div><ProgressBar value={levelPct}/><p>{number((cur?.nextLevelXp || 400) - (cur?.totalXp || 0))} XP nữa để lên Level {(cur?.level || 1)+1}</p></div><div className="hero-emblem"><div className="hero-emblem-ring"><Zap size={66} fill="currentColor"/></div><span>LEVEL {cur?.level || 1}</span></div></article>
                <section className="panel character-card" aria-label="Chỉ số nhân vật"><div className="panel-head"><h3>Chỉ số nhân vật</h3><span className="subtle-text">Tổng {number(cur?.totalXp || 0)} XP</span></div><ul className="stat-list">{cur?.areas.map(a => {const Icon=categoryIcons[a.category]; const areaPct=pct(a.xp-a.levelStartXp,a.nextLevelXp-a.levelStartXp); return <li key={a.category} className="stat-row"><IconBubble icon={Icon} tone={categoryColors[a.category]}/><div className="stat-body"><div className="stat-top"><strong>{categoryLabel(a.category)}</strong><span>Lv {a.level} · {number(a.xp)} XP</span></div><ProgressBar value={areaPct} variant="green" size="slim"/><small>{number(a.nextLevelXp-a.xp)} XP nữa lên Lv {a.level+1}</small></div></li>;})}</ul></section>
                <div className="metric-grid"><div className="metric-card"><span className="metric-icon orange"><Flame size={21}/></span><span className="metric-label">Best habit streak</span><strong>{cur?.currentStreak || 0} <small>phiên</small></strong><span className="metric-foot">Số phiên đã lên lịch</span></div><div className="metric-card"><span className="metric-icon green"><CheckCheck size={21}/></span><span className="metric-label">Daily progress</span><strong>{dayPct}<small>%</small></strong><ProgressBar value={dayPct} variant="green" size="slim"/></div><div className="metric-card"><span className="metric-icon purple"><Zap size={21}/></span><span className="metric-label">XP earned today</span><strong>+{dashboard?.earnedXpToday || 0} <small>XP</small></strong><span className="metric-foot">Từ nỗ lực hôm nay</span></div></div>
                <article className="panel quests-panel"><div className="quests-header"><div><div className="section-eyebrow">YOUR MISSIONS</div><h2>Daily Quests <span className="count-pill">{dashboard?.scheduledCount || 0}</span></h2><p>Hoàn thành những gì quan trọng nhất hôm nay.</p></div><div className="date-controls"><button aria-label="Ngày trước" onClick={() => onSelectDate(d => moveDate(d,-1))}><ChevronLeft size={17}/></button><span>{selectedDate === today ? 'Hôm nay' : formatDate(selectedDate, {day:'numeric',month:'short'})}</span><button disabled={selectedDate >= today} aria-label="Ngày tiếp theo" onClick={() => onSelectDate(d => moveDate(d,1))}><ChevronRight size={17}/></button></div></div>
                  <div className="quest-completion-meta"><span><strong>{dashboard?.completedCount || 0}</strong> of {dashboard?.scheduledCount || 0} completed</span><strong>{dayPct}%</strong></div><ProgressBar value={dayPct} variant="green" size="slim"/>
                  <div className="quest-list">{!dashboard?.quests.length ? <EmptyState icon={CalendarDays} title="Không có nhiệm vụ hôm nay" details="Bạn có thể tạo thói quen mới hoặc chọn một ngày khác." action={<button className="btn btn-secondary" onClick={onNewHabit}><Plus size={16}/> Tạo thói quen</button>}/> : dashboard.quests.map(q => {const Icon = categoryIcons[q.category];const completed = q.status === 'COMPLETED'; return <button key={q.habitId} className={`quest-row ${completed ? 'is-done' : ''}`} aria-label={`${completed ? 'Hoàn tác' : 'Hoàn thành'} nhiệm vụ ${q.title}, ${q.xpReward} XP`} aria-pressed={completed} disabled={busyId === q.habitId} onClick={() => onToggleQuest(q)}><span className={`quest-check ${completed ? 'checked' : ''}`}>{completed ? <Check size={17}/> : <Circle size={19}/>}</span><IconBubble icon={Icon} tone={categoryColors[q.category]}/><span className="quest-body"><strong>{q.title}</strong><small><Clock3 size={13}/> {q.targetMinutes} phút <i/> {categoryLabel(q.category)}</small></span><span className={`xp-tag ${completed ? 'earned' : ''}`}>{completed ? <Check size={13}/> : <Zap size={13}/>} {completed ? 'Done' : `+${q.xpReward} XP`}</span></button>; })}</div>
                  <div className="quest-bottom"><span><CheckCircle2 size={16}/> Every small win matters.</span><span>{dateText(selectedDate)}</span></div>
                </article>
              </section>
              <aside className="secondary-column">
                <article className="panel day-score"><CardTitle title="Daily focus" kicker="Độ hoàn thành trong ngày"/><CircleProgress value={dayPct}><strong>{dayPct}<small>%</small></strong><span>completed</span></CircleProgress><p>{dayPct === 100 && (dashboard?.scheduledCount || 0)>0 ? 'Amazing! Bạn đã hoàn thành tất cả nhiệm vụ.' : `Bạn đã hoàn thành ${dashboard?.completedCount || 0}/${dashboard?.scheduledCount || 0} nhiệm vụ. Keep going!`}</p><div className="score-micro"><CheckCircle2 size={16}/> Consistency beats intensity.</div></article>
                <article className="panel side-activity"><CardTitle title="Cân bằng lĩnh vực" kicker="Tỷ lệ hoàn thành 7 ngày gần đây" action={<button className="text-link" onClick={() => goTo('insights')}>Chi tiết <ArrowUpRight size={14}/></button>}/>{weekly && <RadarChart axes={radarAxes(weekly)} compact/>}</article>
                <article className="panel journey-preview"><div className="journey-top"><div className="journey-icon"><Target size={21}/></div><span>66-DAY CHALLENGE</span></div><h3>{journey?.title || 'Your journey'}</h3><div className="journey-day"><strong>Day {journey?.elapsedDays || 0}</strong><span>/ {journey?.durationDays || 66}</span></div><ProgressBar value={journeyPct} variant="blue"/><p>{journeyDonePct}% nhiệm vụ đã hoàn thành từ đầu hành trình</p><button className="inline-link" onClick={() => goTo('journey')}>Xem hành trình <ArrowRight size={16}/></button></article>
              </aside>
            </div>
  </>;
}
