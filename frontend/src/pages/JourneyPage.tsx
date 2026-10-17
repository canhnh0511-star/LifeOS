import { useMemo, useState } from 'react';
import { BookOpen, Dumbbell, Plus, Target } from 'lucide-react';
import type { AchievementDto, AnalyticsDto, BossDto, GoalDto, HabitDto, JourneyDto } from '../api/types';
import { categoryLabel } from '../domain/rules';
import { AchievementList } from '../components/AchievementList';
import { ExerciseLibrary } from '../components/ExerciseLibrary';
import { CampaignMap } from '../components/CampaignMap';
import { EmptyState, IconBubble, ProgressBar } from '../components/primitives';
import { categoryColors, categoryIcons } from '../ui/categories';
import { pct } from '../ui/format';

interface Props {
  journey: JourneyDto | null | undefined; goals: GoalDto[]; habits: HabitDto[]; achievements: AchievementDto[]; weekly: AnalyticsDto | null;
  busyBossId: string | null; onBoss: (boss: BossDto, defeat: boolean) => void;
  onToggleGoal: (goal: GoalDto) => void; onToggleHabit: (habit: HabitDto) => void; onEditHabit: (habit: HabitDto) => void; onNewGoal: () => void; onNewHabit: () => void; onImportPlan?: () => void;
}

export function JourneyPage({ journey, goals, habits, achievements, weekly, busyBossId, onBoss, onToggleGoal, onToggleHabit, onEditHabit, onNewGoal, onNewHabit, onImportPlan }: Props) {
  const [library, setLibrary] = useState(false);
  const journeyPct = journey ? pct(journey.elapsedDays, journey.durationDays) : 0;
  const journeyDonePct = journey ? pct(journey.completedToDate, journey.totalScheduledToDate) : 0;
  const categoryStats = useMemo(() => Object.fromEntries((weekly?.categories || []).map(c => [c.category, c])), [weekly]);
  return <>
            {library && <ExerciseLibrary onClose={() => setLibrary(false)}/>}
            <div className="page-header"><div><div className="eyebrow"><span className="eyebrow-dash"/> PLAN WITH PURPOSE</div><h1>Build your <span className="text-gradient">journey.</span></h1><p>Chuyển mục tiêu lớn thành những thói quen nhỏ có thể duy trì.</p></div><button className="btn btn-primary" onClick={onNewGoal}><Plus size={18}/> Mục tiêu mới</button></div>
            <article className="journey-banner"><div><span className="section-eyebrow">YOUR TRANSFORMATION</span><h2>{journey?.title || '66-Day Transformation'}</h2><p>Thời gian trôi qua không đồng nghĩa với tiến bộ. Mình theo dõi cả hai.</p></div><div className="journey-stats"><div><strong>{journey?.elapsedDays || 0}<small> / {journey?.durationDays || 66}</small></strong><span>Ngày hành trình</span><ProgressBar value={journeyPct} variant="blue" size="slim"/></div><div><strong>{journeyDonePct}<small>%</small></strong><span>Hoàn thành nhiệm vụ</span><ProgressBar value={journeyDonePct} variant="green" size="slim"/></div></div></article>
            {journey && <section className="campaign-section" aria-label="Chiến dịch"><div className="section-header"><div><div className="section-eyebrow">CAMPAIGN</div><h2>Bản đồ cửa ải</h2></div></div><CampaignMap chapters={journey.chapters} busyBossId={busyBossId} onDefeat={b => onBoss(b, true)} onUndo={b => onBoss(b, false)}/></section>}
            <section className="achievement-section" aria-label="Thành tựu"><div className="section-header"><div><div className="section-eyebrow">ACHIEVEMENTS</div><h2>Thành tựu <span className="count-pill">{achievements.filter(a => a.status === 'EARNED').length}/{achievements.length}</span></h2></div></div><AchievementList achievements={achievements}/></section>
            <div className="section-header"><div><div className="section-eyebrow">LIFE AREAS</div><h2>My goals <span className="count-pill">{goals.length}</span></h2></div><span className="section-actions"><button className="btn btn-quiet" onClick={() => setLibrary(true)}><BookOpen size={17}/> Thư viện bài tập</button>{onImportPlan && <button className="btn btn-quiet" onClick={onImportPlan}><Dumbbell size={17}/> Nạp giáo án gym</button>}<button className="btn btn-outlined" onClick={onNewHabit}><Plus size={17}/> Thói quen mới</button></span></div>
            {goals.length===0 ? <EmptyState icon={Target} title="Chưa có mục tiêu" details="Tạo mục tiêu đầu tiên để bắt đầu hành trình." action={<><button className="btn btn-primary" onClick={onNewGoal}>Thêm mục tiêu</button>{onImportPlan && <button className="btn btn-quiet" onClick={onImportPlan}><Dumbbell size={16}/> Nạp giáo án gym</button>}</>}/> : <div className="goals-grid">{goals.map(goal => {const Icon=categoryIcons[goal.category]; const ownHabits=habits.filter(h=>h.goalId===goal.id&&h.status!=='ARCHIVED');const stats=categoryStats[goal.category]; const progress=pct(stats?.completed || 0,stats?.scheduled || 0);return <article className={`goal-card ${goal.status !== 'ACTIVE' ? 'goal-paused' : ''}`} key={goal.id}><div className="goal-card-head"><IconBubble icon={Icon} tone={categoryColors[goal.category]}/><button className="goal-pause" onClick={() => onToggleGoal(goal)} title={goal.status === 'ACTIVE' ? 'Tạm dừng' : 'Kích hoạt'}>{goal.status === 'ACTIVE' ? 'Tạm dừng' : 'Tiếp tục'}</button></div><span className="category-label">{categoryLabel(goal.category)}</span><h3>{goal.title}</h3><p>{goal.description || 'Một bước nhỏ mỗi ngày.'}</p><div className="goal-progress-row"><span>Hoàn thành tuần này</span><strong>{progress}%</strong></div><ProgressBar value={progress} variant="green" size="slim"/><div className="goal-habits"><strong>{ownHabits.length} thói quen</strong>{ownHabits.length===0 && <span className="subtle-text">Chưa có thói quen</span>}{ownHabits.map(h => <div className="goal-habit" key={h.id}><span className={`small-status-dot ${h.status === 'ACTIVE' ? '' : 'paused'}`}/><span>{h.title}</span><button onClick={() => onEditHabit(h)} aria-label={`Sửa thói quen ${h.title}`}>Sửa</button><button onClick={() => onToggleHabit(h)} title={h.status === 'ACTIVE' ? 'Tạm dừng' : 'Tiếp tục'}>{h.status === 'ACTIVE' ? 'Pause' : 'Resume'}</button></div>)}</div></article>;})}</div>}
  </>;
}
