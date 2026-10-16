import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, Layers3, Menu, RotateCcw, Settings2, ShieldCheck, Sparkles, X } from 'lucide-react';
import { api, isDemo } from './api';
import { exportDemoData, resetDemoData } from './api/mockClient';
import type { MetricDto, ItemDto, BossDto, CreateGoalRequest, CreateHabitRequest, GoalDto, HabitDto, PatchHabit, QuestDto, QuestObjectiveDto, RewardEffectDto } from './api/types';
import { formatDate, todayInTimezone } from './domain/rules';
import { Celebration, hasCelebration, type CelebrationData } from './components/Celebration';
import { levelUps } from './domain/levelUps';
import { EditHabitForm, GoalForm, HabitForm } from './components/forms';
import { Modal } from './components/Modal';
import { Logo } from './components/primitives';
import { SettingsPanel } from './components/SettingsPanel';
import { useLifeOsData } from './hooks/useLifeOsData';
import { InsightsPage } from './pages/InsightsPage';
import { JourneyPage } from './pages/JourneyPage';
import { CharacterPage } from './pages/CharacterPage';
import { BodyPage } from './pages/BodyPage';
import { TodayPage } from './pages/TodayPage';
import { withEffects } from './ui/messages';
import { primaryNav, tabFromHash, type Tab } from './ui/nav';
import './styles.css';

type ModalKind = 'goal' | 'habit' | 'editHabit' | 'settings' | null;
const MODAL_TITLES = { goal: 'Mục tiêu mới', habit: 'Thói quen mới', editHabit: 'Sửa thói quen', settings: 'Cài đặt hệ thống' } as const;
/** Error notices start with this mark so the toast can tell them from system messages. */
const ERROR_MARK = '⚠ ';
const failure = (e: unknown, fallback: string) => ERROR_MARK + (e instanceof Error ? e.message : fallback);
/** Fresh progress for level-up detection; a failure here must not hide that the action itself succeeded. */
const latestProgress = () => api.getProgress().catch(() => undefined);

export default function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [selectedDate, setSelectedDate] = useState(todayInTimezone());
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');
  const { dashboard, goals, habits, achievements, items, metrics, metricsFailed, reloadMetrics, analytics, weekly, loading, error, refresh: refreshNow } = useLifeOsData(selectedDate, period);
  const [modal, setModal] = useState<ModalKind>(null);
  const [editing, setEditing] = useState<HabitDto | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyBossId, setBusyBossId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [notice, setNotice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const today = todayInTimezone();

  useEffect(() => {
    const sync = () => setTab(tabFromHash());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4200); return () => clearTimeout(timer); }, [notice]);

  // Checklist taps go out one after another, each carrying an absolute value, so quick repeated taps cannot overtake each other.
  // Anything else that wants fresh data waits until the queue is empty, so a refresh can never show older numbers than the taps just made.
  const objectiveQueue = useRef<Promise<void>>(Promise.resolve());
  const objectivesInFlight = useRef(0);
  const refreshWanted = useRef(false);
  const dashboardRef = useRef(dashboard); dashboardRef.current = dashboard;
  const queueResult = useRef<{ xp: number; effects: RewardEffectDto[]; titles: string[] }>({ xp: 0, effects: [], titles: [] });
  const refresh = useCallback(() => { if (objectivesInFlight.current > 0) refreshWanted.current = true; else refreshNow(); }, [refreshNow]);

  const completion = useCallback(async (quest: QuestDto) => {
    if (busyId) return; setBusyId(quest.habitId);
    try {
      await objectiveQueue.current; // let pending checklist taps land first, so this does not run ahead of them and get overwritten
      const r = quest.status === 'COMPLETED' ? await api.undoQuest(quest.habitId, selectedDate) : await api.completeQuest(quest.habitId, selectedDate);
      const next = await latestProgress(); const ups = next ? levelUps(dashboard?.progress, next) : null; if (ups && hasCelebration(ups)) setCelebration(ups);
      setNotice(withEffects(r.xpAwarded > 0 ? `Hoàn thành! +${r.xpAwarded} XP` : r.xpAwarded < 0 ? `Đã hoàn tác ${r.xpAwarded} XP` : 'Đã cập nhật nhiệm vụ.', r.effects)); refresh();
    } catch (e) { setNotice(failure(e, 'Không thể cập nhật nhiệm vụ.')); }
    finally { setBusyId(null); }
  }, [busyId, selectedDate, dashboard, refresh]);

  const setObjective = (quest: QuestDto, objective: QuestObjectiveDto, value: number) => {
    objectivesInFlight.current++;
    objectiveQueue.current = objectiveQueue.current.then(async () => {
      try {
        const r = await api.setObjective(quest.habitId, selectedDate, objective.id, value);
        if (r.xpAwarded !== 0 || r.effects.length) {
          const acc = queueResult.current; acc.xp += r.xpAwarded; acc.effects.push(...r.effects); acc.titles.push(quest.title);
        }
      } catch (e) { setNotice(failure(e, 'Không thể cập nhật tiến độ.')); }
      finally {
        if (--objectivesInFlight.current === 0) {
          // One celebration and one message for the whole burst of taps, measured against what the screen showed before it.
          const acc = queueResult.current; queueResult.current = { xp: 0, effects: [], titles: [] };
          refreshWanted.current = false; refreshNow();
          if (acc.xp !== 0 || acc.effects.length) {
            const next = await latestProgress(); const ups = next ? levelUps(dashboardRef.current?.progress, next) : null; if (ups && hasCelebration(ups)) setCelebration(ups);
            setNotice(withEffects(acc.xp > 0 ? `Hoàn thành "${acc.titles[acc.titles.length - 1]}"! +${acc.xp} XP` : acc.xp < 0 ? `Nhiệm vụ trở lại dang dở: ${acc.xp} XP` : 'Đã cập nhật tiến độ.', acc.effects));
          }
        }
      }
    });
  };
  const [busyItemCode, setBusyItemCode] = useState<string | null>(null);
  const wear = async (item: ItemDto, on: boolean) => {
    if (busyItemCode) return; setBusyItemCode(item.code);
    try { if (on) await api.equipItem(item.code); else await api.unequipItem(item.code); setNotice(on ? `Đã đeo ${item.name}` : `Đã tháo ${item.name}`); refresh(); }
    catch (e) { setNotice(failure(e, 'Không thể đổi trang bị.')); }
    finally { setBusyItemCode(null); }
  };
  const [bodyBusy, setBodyBusy] = useState(false);
  const bodyBusyRef = useRef(false);
  /** Runs one body-metric call; the notice says what happened and `true` tells the form it can clear itself. */
  const bodyCall = async (run: () => Promise<unknown>, done: string, fallback: string): Promise<boolean> => {
    if (bodyBusyRef.current) return false; bodyBusyRef.current = true; setBodyBusy(true);
    try { await run(); setNotice(done); await reloadMetrics(); return true; }
    catch (e) { setNotice(failure(e, fallback)); return false; }
    finally { bodyBusyRef.current = false; setBodyBusy(false); }
  };
  const recordMeasure = (m: MetricDto, date: string, value: number) => bodyCall(() => api.recordMeasurement(m.id, date, value), `Đã lưu ${m.name}`, 'Không thể lưu số đo.');
  const removeMeasure = (m: MetricDto, date: string) => { void bodyCall(() => api.removeMeasurement(m.id, date), `Đã xoá số đo ${m.name}`, 'Không thể xoá số đo.'); };
  const createMetric = (name: string, unit: string) => bodyCall(() => api.createMetric({ name, unit }), `Đã thêm chỉ số ${name}`, 'Không thể thêm chỉ số.');
  const deleteMetric = (m: MetricDto) => { void bodyCall(() => api.deleteMetric(m.id), `Đã xoá chỉ số ${m.name}`, 'Không thể xoá chỉ số.'); };
  const bossAction = async (boss: BossDto, defeat: boolean) => {
    if (busyBossId) return; setBusyBossId(boss.id);
    try {
      const r = defeat ? await api.defeatBoss(boss.id) : await api.undoBoss(boss.id);
      const next = await latestProgress(); const ups = next ? levelUps(dashboard?.progress, next) : { level: null, areas: [] };
      if (defeat && r.status === 'DEFEATED' && r.xpAwarded > 0) setCelebration({ ...ups, boss: { boss, xp: boss.xpReward, badgeName: dashboard?.journey?.chapters.find(c => c.boss.id === boss.id)?.badge.name ?? null } });
      else if (hasCelebration(ups)) setCelebration(ups);
      setNotice(withEffects(r.xpAwarded > 0 ? `Đã hạ ${boss.name}! +${r.xpAwarded} XP` : r.xpAwarded < 0 ? `Đã hoàn tác ${boss.name}: ${r.xpAwarded} XP` : 'Đã cập nhật boss.', r.effects)); refresh();
    } catch (e) { setNotice(failure(e, 'Không thể cập nhật boss.')); }
    finally { setBusyBossId(null); }
  };
  const saveGoal = async (v: CreateGoalRequest) => { try { await api.createGoal(v); setModal(null); setNotice('Đã tạo mục tiêu mới.'); refresh(); } catch (e) { setNotice(failure(e, 'Có lỗi xảy ra.')); } };
  const saveHabit = async (v: CreateHabitRequest) => { try { await api.createHabit(v); setModal(null); setNotice('Đã tạo thói quen mới.'); refresh(); } catch (e) { setNotice(failure(e, 'Có lỗi xảy ra.')); } };
  const saveHabitEdit = async (patch: PatchHabit) => {
    if (!editing) return;
    try {
      await api.updateHabit(editing.id, patch); setModal(null); setEditing(null);
      setNotice(patch.status === 'ARCHIVED' ? 'Đã lưu trữ thói quen. Thói quen biến khỏi Today từ ngày mai.' : patch.weekdays ? 'Đã cập nhật thói quen. Lịch mới có hiệu lực từ ngày mai.' : 'Đã cập nhật thói quen.'); refresh();
    } catch (e) { setNotice(failure(e, 'Có lỗi xảy ra.')); }
  };
  const toggleGoal = async (goal: GoalDto) => { try { await api.updateGoal(goal.id, { status: goal.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }); setNotice('Đã cập nhật mục tiêu. Có hiệu lực từ ngày mai.'); refresh(); } catch (e) { setNotice(failure(e, 'Có lỗi.')); } };
  const toggleHabit = async (habit: HabitDto) => { try { await api.updateHabit(habit.id, { status: habit.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }); setNotice('Đã cập nhật thói quen. Có hiệu lực từ ngày mai.'); refresh(); } catch (e) { setNotice(failure(e, 'Có lỗi.')); } };
  const goTo = (screen: Tab) => { setTab(screen); window.location.hash = screen; setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const reset = () => { if (!isDemo) return; if (!window.confirm('Khôi phục dữ liệu mẫu? Các thay đổi trên máy này sẽ mất.')) return; resetDemoData(); setSelectedDate(todayInTimezone()); setModal(null); setNotice('Đã khôi phục dữ liệu mẫu.'); refresh(); };
  const logout = async () => { try { await api.logout(); } catch (e) { setNotice(failure(e, 'Không đăng xuất được.')); return; } window.location.reload(); };
  const exportData = () => { if (!isDemo) return; const blob = new Blob([exportDemoData()], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `life-os-demo-${today}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="sidebar-top"><Logo/><button className="mobile-close icon-btn" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}><X size={20}/></button></div>
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Điều hướng chính">{primaryNav.map(item => <button key={item.id} className={`nav-item ${tab === item.id ? 'active' : ''}`} aria-current={tab === item.id ? 'page' : undefined} onClick={() => goTo(item.id)}><item.icon size={19}/><span>{item.title}</span>{tab === item.id && <span className="nav-indicator"/>}</button>)}</nav>
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
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-btn" aria-label="Mở menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={21}/></button><span className="breadcrumb">Workspace</span><span className="slash">/</span><strong>{primaryNav.find(n => n.id === tab)?.title}</strong></div><div className="topbar-right"><span className="demo-pill"><span/> {isDemo ? 'DEMO MODE' : 'CONNECTED'}</span><span className="top-date"><CalendarDays size={16}/> {formatDate(today, { day: 'numeric', month: 'short', year: 'numeric' })}</span><button onClick={() => setModal('settings')} aria-label="Cài đặt" className="top-avatar">C</button></div></header>
      <main className="page-content" data-dialog-fallback tabIndex={-1}>
        {error && <div role="alert" className="error-banner">{error}<button onClick={refresh}>Thử lại <RotateCcw size={14}/></button></div>}
        {loading && !dashboard ? <div className="loading-shell"><div className="loader"/><p>Đang chuẩn bị hành trình của bạn...</p></div> : <>
          {tab === 'today' && <TodayPage dashboard={dashboard} selectedDate={selectedDate} today={today} busyId={busyId} onSelectDate={setSelectedDate} onToggleQuest={completion} onSetObjective={setObjective} onNewHabit={() => setModal('habit')} goTo={goTo}/>}
          {tab === 'journey' && <JourneyPage journey={dashboard?.journey} goals={goals} habits={habits} achievements={achievements} weekly={weekly} busyBossId={busyBossId} onBoss={bossAction} onToggleGoal={toggleGoal} onToggleHabit={toggleHabit} onEditHabit={h => { setEditing(h); setModal('editHabit'); }} onNewGoal={() => setModal('goal')} onNewHabit={() => setModal('habit')}/>}
          {tab === 'character' && <CharacterPage dashboard={dashboard} items={items} busyItemCode={busyItemCode} onEquip={item => wear(item, true)} onUnequip={item => wear(item, false)}/>}
          {tab === 'body' && <BodyPage metrics={metrics} failed={metricsFailed} onRetry={() => { void reloadMetrics(); }} today={today} busy={bodyBusy} onRecord={recordMeasure} onRemoveEntry={removeMeasure} onCreate={createMetric} onDelete={deleteMetric}/>}
          {tab === 'insights' && <InsightsPage analytics={analytics} period={period} onPeriod={setPeriod} currentStreak={dashboard?.progress.currentStreak || 0}/>}
        </>}
        <footer className="footer"><span>© Life OS · Built for progress, not perfection.</span><span>Version 0.1.0 · {isDemo ? 'Mock API' : 'Real API'} · Asia/Ho_Chi_Minh</span></footer>
      </main>
    </div>
    <nav className="bottom-nav" aria-label="Điều hướng mobile">{primaryNav.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => goTo(item.id)}><item.icon size={21}/><span>{item.title}</span></button>)}</nav>
    {modal && <Modal title={MODAL_TITLES[modal]} onClose={() => setModal(null)}>
      {modal === 'goal' && <GoalForm onClose={() => setModal(null)} onSave={saveGoal}/>}
      {modal === 'habit' && <HabitForm goals={goals} onClose={() => setModal(null)} onSave={saveHabit}/>}
      {modal === 'editHabit' && editing && <EditHabitForm habit={editing} onClose={() => { setModal(null); setEditing(null); }} onSave={saveHabitEdit}/>}
      {modal === 'settings' && <SettingsPanel isDemo={isDemo} onExport={exportData} onReset={reset} onLogout={logout}/>}
    </Modal>}
    {celebration && <Celebration data={celebration} onClose={() => setCelebration(null)}/>}
    {notice && <div role={notice.startsWith(ERROR_MARK) ? 'alert' : 'status'} className={`toast ${notice.startsWith(ERROR_MARK) ? 'toast-error' : ''}`}><Sparkles size={18}/><span className="toast-text"><b className="toast-tag">{notice.startsWith(ERROR_MARK) ? 'LỖI' : 'HỆ THỐNG'}</b>{notice.replace(ERROR_MARK, '')}</span><button aria-label="Đóng thông báo" onClick={() => setNotice('')}><X size={15}/></button></div>}
  </div>;
}
