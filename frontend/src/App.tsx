import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight, ArrowUpRight, BarChart3, BookOpen,
  CalendarDays, Check, CheckCheck, CheckCircle2, ChevronLeft, ChevronRight, Circle,
  Clock3, Code2, Compass, Download, Flame, Heart, Home, Layers3, Lightbulb,
  Menu, Music2, Plus, RotateCcw, Settings2, ShieldCheck,
  Sparkles, Target, Trophy, X, Zap
} from 'lucide-react';
import { api, isDemo } from './api';
import { exportDemoData, resetDemoData } from './api/mockClient';
import type { AnalyticsDto, CreateGoalRequest, CreateHabitRequest, DailyDashboardDto, GoalCategory, GoalDto, HabitDto, QuestDto, Weekday } from './api/types';
import { categoryLabel, formatDate, moveDate, todayInTimezone } from './domain/rules';
import { buildInsights, radarAxes } from './domain/insights';
import { RadarChart } from './components/RadarChart';
import './styles.css';

type Tab = 'today' | 'journey' | 'insights';
type Modal = 'goal' | 'habit' | 'settings' | null;
function tabFromHash(): Tab {
  const hash = typeof window === 'undefined' ? '' : window.location.hash.slice(1);
  return hash === 'journey' || hash === 'insights' ? hash : 'today';
}
const primaryNav: { id: Tab; title: string; icon: typeof Home }[] = [
  { id: 'today', title: 'Hôm nay', icon: Home },
  { id: 'journey', title: 'Hành trình', icon: Compass },
  { id: 'insights', title: 'Thống kê', icon: BarChart3 }
];
const categoryIcons: Record<GoalCategory, typeof Home> = {
  CAREER: Code2, CREATIVITY: Music2, HEALTH: Heart, KNOWLEDGE: BookOpen, MINDFULNESS: Sparkles
};
const categoryColors: Record<GoalCategory, string> = {
  CAREER: 'blue', CREATIVITY: 'purple', HEALTH: 'orange', KNOWLEDGE: 'green', MINDFULNESS: 'pink'
};
const weekdays: { day: Weekday; short: string }[] = [
  { day: 1, short: 'T2' }, { day: 2, short: 'T3' }, { day: 3, short: 'T4' },
  { day: 4, short: 'T5' }, { day: 5, short: 'T6' }, { day: 6, short: 'T7' }, { day: 7, short: 'CN' }
];
const dateText = (date: string) => formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
const pct = (a: number, b: number) => b ? Math.round(100 * a / b) : 0;
const number = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

function Logo() {
  return <div className="brand"><div className="brand-symbol"><Zap size={22} fill="currentColor" strokeWidth={2.4} /></div><span>LIFE<span className="brand-light">OS</span><span className="brand-dot">.</span></span></div>;
}
function ProgressBar({ value, variant = 'lime', size = 'regular' }: { value: number; variant?: string; size?: string }) {
  return <div className={`progress-track ${size}`}><div className={`progress-fill ${variant}`} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></div>;
}
function CardTitle({ title, kicker, action }: { title: string; kicker?: string; action?: ReactNode }) {
  return <div className="card-title-row"><div><h3>{title}</h3>{kicker && <p className="subtle-text">{kicker}</p>}</div>{action}</div>;
}
function IconBubble({ icon: Icon, tone = 'blue', size = 'normal' }: { icon: typeof Home; tone?: string; size?: string }) {
  return <span className={`icon-bubble tone-${tone} ${size}`}><Icon size={size === 'small' ? 17 : 20} strokeWidth={1.85} /></span>;
}
function CircleProgress({ value, children }: { value: number; children: ReactNode }) {
  return <div className="circle-progress" style={{ '--progress': `${value}%` } as CSSProperties}><div className="circle-progress-inner">{children}</div></div>;
}
function EmptyState({ icon: Icon, title, details, action }: { icon: typeof Home; title: string; details: string; action?: ReactNode }) {
  return <div className="empty-state"><Icon size={29} /><h3>{title}</h3><p>{details}</p>{action}</div>;
}
function ActivityBars({ analytics, compact = false }: { analytics: AnalyticsDto; compact?: boolean }) {
  const selected = compact ? analytics.days.slice(-7) : analytics.days;
  const cap = Math.max(1, ...selected.map(d => d.scheduled));
  return <div className={`activity-chart ${compact ? 'compact' : ''}`} aria-label="Biểu đồ hoạt động theo ngày">
    {selected.map(day => {
      const doneHeight = day.completed / cap * 100;
      const scheduledHeight = day.scheduled / cap * 100;
      return <div className="activity-col" key={day.date} title={`${day.date}: ${day.completed}/${day.scheduled} nhiệm vụ`}>
        <div className="activity-bar-space">
          <div className="activity-bar-total" style={{ height: `${Math.max(scheduledHeight, 4)}%` }} />
          <div className="activity-bar-done" style={{ height: `${doneHeight}%` }} />
        </div>
        <span>{compact ? new Intl.DateTimeFormat('vi-VN', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`)).replace('Th ', 'T') : day.date.slice(8)}</span>
      </div>;
    })}
  </div>;
}

function GoalForm({ onClose, onSave }: { onClose: () => void; onSave: (v: CreateGoalRequest) => Promise<void> }) {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('CAREER'); const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!title.trim()) return; setSaving(true); try { await onSave({ title: title.trim(), description: description.trim(), category }); } finally { setSaving(false); } };
  return <form onSubmit={submit} className="form-stack">
    <label>Tên mục tiêu <input value={title} onChange={e => setTitle(e.target.value)} autoFocus maxLength={150} required placeholder="Ví dụ: Become a better engineer" /></label>
    <label>Lĩnh vực <select value={category} onChange={e => setCategory(e.target.value as GoalCategory)}>{(Object.keys(categoryIcons) as GoalCategory[]).map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}</select></label>
    <label>Mô tả <textarea rows={3} value={description} maxLength={600} onChange={e => setDescription(e.target.value)} placeholder="Mình muốn đạt được điều gì?" /></label>
    <div className="form-actions"><button type="button" className="btn btn-quiet" onClick={onClose}>Hủy</button><button className="btn btn-primary" disabled={saving || !title.trim()}><Plus size={16}/>{saving ? 'Đang lưu...' : 'Tạo mục tiêu'}</button></div>
  </form>;
}
function HabitForm({ goals, onClose, onSave }: { goals: GoalDto[]; onClose: () => void; onSave: (v: CreateHabitRequest) => Promise<void> }) {
  const [goalId, setGoalId] = useState(goals.find(g => g.status === 'ACTIVE')?.id || '');
  const [title, setTitle] = useState(''); const [targetMinutes, setMinutes] = useState(30);
  const [xpReward, setReward] = useState(35); const [days, setDays] = useState<Weekday[]>([1,2,3,4,5,6,7]);
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!title.trim() || !days.length) return; setSaving(true); try { await onSave({ goalId, title: title.trim(), targetMinutes, xpReward, weekdays: days, startDate: todayInTimezone() }); } finally { setSaving(false); } };
  return <form onSubmit={submit} className="form-stack">
    <label>Thói quen <input value={title} onChange={e => setTitle(e.target.value)} required autoFocus placeholder="Ví dụ: Luyện piano 30 phút" maxLength={150}/></label>
    <label>Thuộc mục tiêu <select value={goalId} onChange={e => setGoalId(e.target.value)} required>{goals.filter(g => g.status === 'ACTIVE').map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
    <div className="form-columns"><label>Thời lượng (phút) <input type="number" min="1" max="480" value={targetMinutes} onChange={e => setMinutes(Number(e.target.value))} required /></label><label>XP thưởng <select value={xpReward} onChange={e => setReward(Number(e.target.value))}><option value="20">20 XP · Dễ</option><option value="35">35 XP · Vừa</option><option value="40">40 XP · Vừa+</option><option value="50">50 XP · Khó</option></select></label></div>
    <fieldset className="weekday-field"><legend>Lịch lặp hằng tuần</legend><div className="weekday-choice">{weekdays.map(d => <button type="button" key={d.day} className={days.includes(d.day) ? 'selected' : ''} aria-pressed={days.includes(d.day)} onClick={() => setDays(v => v.includes(d.day) ? v.filter(x => x !== d.day) : [...v, d.day].sort())}>{d.short}</button>)}</div></fieldset>
    <p className="form-note">Lịch bắt đầu từ hôm nay. Thay đổi lịch trong quá khứ chưa được hỗ trợ ở MVP.</p>
    <div className="form-actions"><button type="button" className="btn btn-quiet" onClick={onClose}>Hủy</button><button className="btn btn-primary" disabled={saving || !title.trim() || !goalId || !days.length || !(targetMinutes > 0)}><Plus size={16}/>{saving ? 'Đang lưu...' : 'Tạo thói quen'}</button></div>
  </form>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [selectedDate, setSelectedDate] = useState(todayInTimezone());
  const [period, setPeriod] = useState<'7d'|'30d'>('7d');
  const [dashboard, setDashboard] = useState<DailyDashboardDto | null>(null);
  const [goals, setGoals] = useState<GoalDto[]>([]); const [habits, setHabits] = useState<HabitDto[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsDto | null>(null); const [weekly, setWeekly] = useState<AnalyticsDto | null>(null);
  const [modal, setModal] = useState<Modal>(null); const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [notice, setNotice] = useState(''); const [menuOpen, setMenuOpen] = useState(false);
  const [revision, setRevision] = useState(0); const today = todayInTimezone();
  const refresh = () => setRevision(n => n + 1);
  useEffect(() => {
    let alive = true;
    Promise.all([api.getDashboard(selectedDate), api.getGoals(), api.getHabits(), api.getAnalytics('7d'), period === '30d' ? api.getAnalytics('30d') : Promise.resolve(null)])
      .then(([d, g, h, w, m]) => { if (alive) { setDashboard(d); setGoals(g); setHabits(h); setWeekly(w); setAnalytics(m ?? w); setError(''); } })
      .catch((e: Error) => { if (alive) setError(e.message || 'Không tải được dữ liệu.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [selectedDate, period, revision]);
  useEffect(() => {
    const sync = () => setTab(tabFromHash());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4200); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => { if (!modal) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null); }; document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }, [modal]);
  const completion = useCallback(async (quest: QuestDto) => {
    if (busyId) return; setBusyId(quest.habitId);
    try {
      const r = quest.status === 'COMPLETED' ? await api.undoQuest(quest.habitId, selectedDate) : await api.completeQuest(quest.habitId, selectedDate);
      setNotice(r.xpAwarded > 0 ? `Hoàn thành! +${r.xpAwarded} XP` : r.xpAwarded < 0 ? `Đã hoàn tác ${r.xpAwarded} XP` : 'Đã cập nhật nhiệm vụ.'); refresh();
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Không thể cập nhật nhiệm vụ.'); }
    finally { setBusyId(null); }
  }, [busyId, selectedDate]);
  const saveGoal = async (v: CreateGoalRequest) => { try { await api.createGoal(v); setModal(null); setNotice('Đã tạo mục tiêu mới.'); refresh(); } catch (e) { setNotice(e instanceof Error ? e.message : 'Có lỗi xảy ra.'); } };
  const saveHabit = async (v: CreateHabitRequest) => { try { await api.createHabit(v); setModal(null); setNotice('Đã tạo thói quen mới.'); refresh(); } catch (e) { setNotice(e instanceof Error ? e.message : 'Có lỗi xảy ra.'); } };
  const toggleGoal = async (goal: GoalDto) => { try { await api.updateGoal(goal.id, { status: goal.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }); setNotice('Đã cập nhật mục tiêu. Có hiệu lực từ ngày mai.'); refresh(); } catch (e) { setNotice(e instanceof Error ? e.message : 'Có lỗi.'); } };
  const toggleHabit = async (habit: HabitDto) => { try { await api.updateHabit(habit.id, { status: habit.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }); setNotice('Đã cập nhật thói quen. Có hiệu lực từ ngày mai.'); refresh(); } catch (e) { setNotice(e instanceof Error ? e.message : 'Có lỗi.'); } };
  const goTo = (screen: Tab) => { setTab(screen); window.location.hash = screen; setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const reset = () => { if (!isDemo) return; if (!window.confirm('Khôi phục dữ liệu mẫu? Các thay đổi trên máy này sẽ mất.')) return; resetDemoData(); setSelectedDate(todayInTimezone()); setModal(null); setNotice('Đã khôi phục dữ liệu mẫu.'); refresh(); };
  const exportData = () => { if (!isDemo) return; const blob = new Blob([exportDemoData()], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `life-os-demo-${today}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const cur = dashboard?.progress;
  const journey = dashboard?.journey;
  const dayPct = pct(dashboard?.completedCount || 0, dashboard?.scheduledCount || 0);
  const levelPct = cur ? pct(cur.totalXp - cur.levelStartXp, cur.nextLevelXp - cur.levelStartXp) : 0;
  const journeyPct = journey ? pct(journey.elapsedDays, journey.durationDays) : 0;
  const journeyDonePct = journey ? pct(journey.completedToDate, journey.totalScheduledToDate) : 0;
  const categoryStats = useMemo(() => Object.fromEntries((weekly?.categories || []).map(c => [c.category, c])), [weekly]);
  const insights = useMemo(() => analytics ? buildInsights(analytics) : [], [analytics]);
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="sidebar-top"><Logo/><button className="mobile-close icon-btn" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}><X size={20}/></button></div>
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Điều hướng chính">{primaryNav.map(item => <button key={item.id} className={`nav-item ${tab === item.id ? 'active' : ''}`} onClick={() => goTo(item.id)}><item.icon size={19}/><span>{item.title}</span>{tab === item.id && <span className="nav-indicator"/>}</button>)}</nav>
      <div className="sidebar-separator"/>
      <div className="sidebar-section-label">YOUR SYSTEM</div>
      <div className="sidebar-link"><Layers3 size={17}/><span>Personal growth OS</span></div>
      <div className="sidebar-link"><ShieldCheck size={17}/><span>Private by design</span></div>
      <div className="sidebar-spacer"/>
      <div className="sidebar-tip"><span className="tip-icon"><Sparkles size={18}/></span><strong>Little steps, big gains.</strong><p>Không cần hoàn hảo. Chỉ cần tốt hơn hôm qua một chút.</p><div className="tip-glow"/></div>
      <button className="profile-mini" onClick={() => setModal('settings')}><span className="avatar">C</span><span className="profile-text"><strong>{dashboard?.user.displayName || 'Life OS User'}</strong><small>Personal workspace</small></span><Settings2 size={17}/></button>
    </aside>
    {menuOpen && <button className="sidebar-scrim" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}/>}
    <div className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-btn" aria-label="Mở menu" onClick={() => setMenuOpen(true)}><Menu size={21}/></button><span className="breadcrumb">Workspace</span><span className="slash">/</span><strong>{primaryNav.find(n => n.id === tab)?.title}</strong></div><div className="topbar-right"><span className="demo-pill"><span/> {isDemo ? 'DEMO MODE' : 'CONNECTED'}</span><span className="top-date"><CalendarDays size={16}/> {formatDate(today, { day: 'numeric', month: 'short', year: 'numeric' })}</span><button onClick={() => setModal('settings')} aria-label="Cài đặt" className="top-avatar">C</button></div></header>
      <main className="page-content">
        {error && <div role="alert" className="error-banner">{error}<button onClick={refresh}>Thử lại <RotateCcw size={14}/></button></div>}
        {loading && !dashboard ? <div className="loading-shell"><div className="loader"/><p>Đang chuẩn bị hành trình của bạn...</p></div> : <>
          {tab === 'today' && <>
            <div className="page-header"><div><div className="eyebrow"><span className="eyebrow-dash"/> YOUR DAILY COMMAND CENTER</div><h1>Make today <span className="text-gradient">count.</span></h1><p>Mỗi hành động nhỏ là một bước tiến dài trên hành trình của bạn.</p></div><button className="btn btn-outlined" onClick={() => setModal('habit')}><Plus size={17}/> Thói quen mới</button></div>
            <div className="main-grid">
              <section className="primary-column">
                <article className="level-hero"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="hero-copy"><div className="hero-kicker"><Zap size={16} fill="currentColor"/> LEVEL {String(cur?.level || 1).padStart(2,'0')} · THE BUILDER</div><h2>Keep showing up.<br/><span>The rest will follow.</span></h2><div className="level-progress-title"><span>Level progress</span><strong>{number(cur?.totalXp || 0)} <small>/ {number(cur?.nextLevelXp || 400)} XP</small></strong></div><ProgressBar value={levelPct}/><p>{number((cur?.nextLevelXp || 400) - (cur?.totalXp || 0))} XP nữa để lên Level {(cur?.level || 1)+1}</p></div><div className="hero-emblem"><div className="hero-emblem-ring"><Zap size={66} fill="currentColor"/></div><span>LEVEL {cur?.level || 1}</span></div></article>
                <div className="metric-grid"><div className="metric-card"><span className="metric-icon orange"><Flame size={21}/></span><span className="metric-label">Best habit streak</span><strong>{cur?.currentStreak || 0} <small>phiên</small></strong><span className="metric-foot">Số phiên đã lên lịch</span></div><div className="metric-card"><span className="metric-icon green"><CheckCheck size={21}/></span><span className="metric-label">Daily progress</span><strong>{dayPct}<small>%</small></strong><ProgressBar value={dayPct} variant="green" size="slim"/></div><div className="metric-card"><span className="metric-icon purple"><Zap size={21}/></span><span className="metric-label">XP earned today</span><strong>+{dashboard?.earnedXpToday || 0} <small>XP</small></strong><span className="metric-foot">Từ nỗ lực hôm nay</span></div></div>
                <article className="panel quests-panel"><div className="quests-header"><div><div className="section-eyebrow">YOUR MISSIONS</div><h2>Daily Quests <span className="count-pill">{dashboard?.scheduledCount || 0}</span></h2><p>Hoàn thành những gì quan trọng nhất hôm nay.</p></div><div className="date-controls"><button aria-label="Ngày trước" onClick={() => setSelectedDate(d => moveDate(d,-1))}><ChevronLeft size={17}/></button><span>{selectedDate === today ? 'Hôm nay' : formatDate(selectedDate, {day:'numeric',month:'short'})}</span><button disabled={selectedDate >= today} aria-label="Ngày tiếp theo" onClick={() => setSelectedDate(d => moveDate(d,1))}><ChevronRight size={17}/></button></div></div>
                  <div className="quest-completion-meta"><span><strong>{dashboard?.completedCount || 0}</strong> of {dashboard?.scheduledCount || 0} completed</span><strong>{dayPct}%</strong></div><ProgressBar value={dayPct} variant="green" size="slim"/>
                  <div className="quest-list">{!dashboard?.quests.length ? <EmptyState icon={CalendarDays} title="Không có nhiệm vụ hôm nay" details="Bạn có thể tạo thói quen mới hoặc chọn một ngày khác." action={<button className="btn btn-secondary" onClick={() => setModal('habit')}><Plus size={16}/> Tạo thói quen</button>}/> : dashboard.quests.map(q => {const Icon = categoryIcons[q.category];const completed = q.status === 'COMPLETED'; return <button key={q.habitId} className={`quest-row ${completed ? 'is-done' : ''}`} aria-label={`${completed ? 'Hoàn tác' : 'Hoàn thành'} nhiệm vụ ${q.title}, ${q.xpReward} XP`} aria-pressed={completed} disabled={busyId === q.habitId} onClick={() => completion(q)}><span className={`quest-check ${completed ? 'checked' : ''}`}>{completed ? <Check size={17}/> : <Circle size={19}/>}</span><IconBubble icon={Icon} tone={categoryColors[q.category]}/><span className="quest-body"><strong>{q.title}</strong><small><Clock3 size={13}/> {q.targetMinutes} phút <i/> {categoryLabel(q.category)}</small></span><span className={`xp-tag ${completed ? 'earned' : ''}`}>{completed ? <Check size={13}/> : <Zap size={13}/>} {completed ? 'Done' : `+${q.xpReward} XP`}</span></button>; })}</div>
                  <div className="quest-bottom"><span><CheckCircle2 size={16}/> Every small win matters.</span><span>{dateText(selectedDate)}</span></div>
                </article>
              </section>
              <aside className="secondary-column">
                <article className="panel day-score"><CardTitle title="Daily focus" kicker="Độ hoàn thành trong ngày"/><CircleProgress value={dayPct}><strong>{dayPct}<small>%</small></strong><span>completed</span></CircleProgress><p>{dayPct === 100 && (dashboard?.scheduledCount || 0)>0 ? 'Amazing! Bạn đã hoàn thành tất cả nhiệm vụ.' : `Bạn đã hoàn thành ${dashboard?.completedCount || 0}/${dashboard?.scheduledCount || 0} nhiệm vụ. Keep going!`}</p><div className="score-micro"><CheckCircle2 size={16}/> Consistency beats intensity.</div></article>
                <article className="panel side-activity"><CardTitle title="Cân bằng lĩnh vực" kicker="Tỷ lệ hoàn thành 7 ngày gần đây" action={<button className="text-link" onClick={() => goTo('insights')}>Chi tiết <ArrowUpRight size={14}/></button>}/>{weekly && <RadarChart axes={radarAxes(weekly)} compact/>}</article>
                <article className="panel journey-preview"><div className="journey-top"><div className="journey-icon"><Target size={21}/></div><span>66-DAY CHALLENGE</span></div><h3>{journey?.title || 'Your journey'}</h3><div className="journey-day"><strong>Day {journey?.elapsedDays || 0}</strong><span>/ {journey?.durationDays || 66}</span></div><ProgressBar value={journeyPct} variant="blue"/><p>{journeyDonePct}% nhiệm vụ đã hoàn thành từ đầu hành trình</p><button className="inline-link" onClick={() => goTo('journey')}>Xem hành trình <ArrowRight size={16}/></button></article>
              </aside>
            </div>
          </>}
          {tab === 'journey' && <>
            <div className="page-header"><div><div className="eyebrow"><span className="eyebrow-dash"/> PLAN WITH PURPOSE</div><h1>Build your <span className="text-gradient">journey.</span></h1><p>Chuyển mục tiêu lớn thành những thói quen nhỏ có thể duy trì.</p></div><button className="btn btn-primary" onClick={() => setModal('goal')}><Plus size={18}/> Mục tiêu mới</button></div>
            <article className="journey-banner"><div><span className="section-eyebrow">YOUR TRANSFORMATION</span><h2>{journey?.title || '66-Day Transformation'}</h2><p>Thời gian trôi qua không đồng nghĩa với tiến bộ. Mình theo dõi cả hai.</p></div><div className="journey-stats"><div><strong>{journey?.elapsedDays || 0}<small> / {journey?.durationDays || 66}</small></strong><span>Ngày hành trình</span><ProgressBar value={journeyPct} variant="blue" size="slim"/></div><div><strong>{journeyDonePct}<small>%</small></strong><span>Hoàn thành nhiệm vụ</span><ProgressBar value={journeyDonePct} variant="green" size="slim"/></div></div></article>
            <div className="section-header"><div><div className="section-eyebrow">LIFE AREAS</div><h2>My goals <span className="count-pill">{goals.length}</span></h2></div><button className="btn btn-outlined" onClick={() => setModal('habit')}><Plus size={17}/> Thói quen mới</button></div>
            {goals.length===0 ? <EmptyState icon={Target} title="Chưa có mục tiêu" details="Tạo mục tiêu đầu tiên để bắt đầu hành trình." action={<button className="btn btn-primary" onClick={() => setModal('goal')}>Thêm mục tiêu</button>}/> : <div className="goals-grid">{goals.map(goal => {const Icon=categoryIcons[goal.category]; const ownHabits=habits.filter(h=>h.goalId===goal.id);const stats=categoryStats[goal.category]; const progress=pct(stats?.completed || 0,stats?.scheduled || 0);return <article className={`goal-card ${goal.status !== 'ACTIVE' ? 'goal-paused' : ''}`} key={goal.id}><div className="goal-card-head"><IconBubble icon={Icon} tone={categoryColors[goal.category]}/><button className="goal-pause" onClick={() => toggleGoal(goal)} title={goal.status === 'ACTIVE' ? 'Tạm dừng' : 'Kích hoạt'}>{goal.status === 'ACTIVE' ? 'Tạm dừng' : 'Tiếp tục'}</button></div><span className="category-label">{categoryLabel(goal.category)}</span><h3>{goal.title}</h3><p>{goal.description || 'Một bước nhỏ mỗi ngày.'}</p><div className="goal-progress-row"><span>Hoàn thành tuần này</span><strong>{progress}%</strong></div><ProgressBar value={progress} variant="green" size="slim"/><div className="goal-habits"><strong>{ownHabits.length} thói quen</strong>{ownHabits.length===0 && <span className="subtle-text">Chưa có thói quen</span>}{ownHabits.map(h => <div className="goal-habit" key={h.id}><span className={`small-status-dot ${h.status === 'ACTIVE' ? '' : 'paused'}`}/><span>{h.title}</span><button onClick={() => toggleHabit(h)} title={h.status === 'ACTIVE' ? 'Tạm dừng' : 'Tiếp tục'}>{h.status === 'ACTIVE' ? 'Pause' : 'Resume'}</button></div>)}</div></article>;})}</div>}
          </>}
          {tab === 'insights' && <>
            <div className="page-header"><div><div className="eyebrow"><span className="eyebrow-dash"/> REFLECT & IMPROVE</div><h1>Progress is <span className="text-gradient">power.</span></h1><p>Không chỉ hoàn thành nhiệm vụ. Hãy hiểu mình đang phát triển ra sao.</p></div><div className="period-switch"><button className={period==='7d'?'active':''} onClick={()=>setPeriod('7d')}>7 ngày</button><button className={period==='30d'?'active':''} onClick={()=>setPeriod('30d')}>30 ngày</button></div></div>
            <div className="insight-stats"><div className="insight-stat"><span><CheckCircle2 size={17}/> Completion rate</span><strong>{analytics?.completionRate || 0}<small>%</small></strong><p>Trong {period==='7d'?'7':'30'} ngày gần nhất</p></div><div className="insight-stat"><span><Trophy size={17}/> Quests completed</span><strong>{analytics?.completedCount || 0}<small> / {analytics?.scheduledCount || 0}</small></strong><p>Nhiệm vụ đã hoàn thành</p></div><div className="insight-stat"><span><Zap size={17}/> XP collected</span><strong>{number(analytics?.earnedXp || 0)}</strong><p>Điểm kinh nghiệm tích lũy</p></div><div className="insight-stat"><span><Flame size={17}/> Best habit streak</span><strong>{cur?.currentStreak || 0}<small> phiên</small></strong><p>Streak tốt nhất hiện tại</p></div></div>
            <div className="insights-grid"><article className="panel analytics-main"><CardTitle title="Cân bằng 5 lĩnh vực" kicker={`Tỷ lệ hoàn thành · ${period === '7d' ? '7' : '30'} ngày gần nhất`}/>{analytics && <RadarChart axes={radarAxes(analytics)}/>}</article><article className="panel category-panel"><CardTitle title="Gợi ý hành động" kicker="Tính từ dữ liệu của bạn, không phải AI"/>{insights.length ? <ul className="insight-list">{insights.map(i => <li key={i.id} className={`insight-item tone-${i.tone}`}><strong>{i.title}</strong><p>{i.detail}</p></li>)}</ul> : <EmptyState icon={Lightbulb} title="Chưa đủ dữ liệu" details="Hoàn thành thêm vài nhiệm vụ để nhận gợi ý."/>}</article></div>
            <article className="panel analytics-days"><CardTitle title="Hoạt động theo ngày" kicker="Số nhiệm vụ hoàn thành so với đã lên lịch"/>{analytics && <ActivityBars analytics={analytics}/>}<div className="chart-legend"><span><i className="legend-done"/>Completed</span><span><i className="legend-planned"/>Planned</span></div></article>
          </>}
        </>}
        <footer className="footer"><span>© Life OS · Built for progress, not perfection.</span><span>Version 0.1.0 · {isDemo ? 'Mock API' : 'Real API'} · Asia/Ho_Chi_Minh</span></footer>
      </main>
    </div>
    <nav className="bottom-nav" aria-label="Điều hướng mobile">{primaryNav.map(item => <button key={item.id} className={tab===item.id?'active':''} onClick={() => goTo(item.id)}><item.icon size={21}/><span>{item.title}</span></button>)}</nav>
    {modal && <div className="modal-backdrop" onMouseDown={e => {if (e.target === e.currentTarget) setModal(null);}}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="modal-heading"><div><span className="section-eyebrow">LIFE OS</span><h2 id="dialog-title">{modal === 'goal' ? 'Mục tiêu mới' : modal === 'habit' ? 'Thói quen mới' : 'Cài đặt hệ thống'}</h2></div><button onClick={() => setModal(null)} className="icon-btn" aria-label="Đóng"><X size={20}/></button></div>{modal === 'goal' && <GoalForm onClose={() => setModal(null)} onSave={saveGoal}/ >}{modal === 'habit' && <HabitForm goals={goals} onClose={() => setModal(null)} onSave={saveHabit}/ >}{modal === 'settings' && <div className="settings-content"><div className="setting-row"><div><strong>API mode</strong><span>{isDemo?'Local mock API (localStorage)':'Remote REST API'}</span></div><span className="setting-status">{isDemo?'DEMO':'LIVE'}</span></div><div className="setting-row"><div><strong>Múi giờ</strong><span>Áp dụng cho ngày và streak</span></div><span>Asia/Ho_Chi_Minh</span></div><div className="settings-actions"><button className="btn btn-secondary" disabled={!isDemo} onClick={exportData}><Download size={16}/> Xuất dữ liệu JSON</button><button className="btn btn-danger" disabled={!isDemo} onClick={reset}><RotateCcw size={16}/> Đặt lại dữ liệu mẫu</button></div><p className="form-note">Dữ liệu mock chỉ lưu trên trình duyệt hiện tại. Chưa đồng bộ thiết bị hoặc tài khoản, không nên dùng làm lưu trữ chính.</p></div>}</section></div>}
    {notice && <div role="status" className="toast"><Sparkles size={18}/>{notice}<button aria-label="Đóng thông báo" onClick={() => setNotice('')}><X size={15}/></button></div>}
  </div>;
}
