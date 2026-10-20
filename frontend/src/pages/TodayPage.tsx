import { Fragment, useEffect, useState } from 'react';
import { BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Circle, ClipboardList, Dumbbell, Clock3, Moon, Timer, Flame, Lock, PartyPopper, Plus, Target, Zap } from 'lucide-react';
import type { BodyGoalDto, MetricDto, AnalyticsDto, WorkoutSetDto, HabitDto, DailyDashboardDto, DailyRewardDto, QuestDto, QuestObjectiveDto } from '../api/types';
import { stageForLevel } from '../domain/characterStage';
import { xpToNextRank } from '../domain/ranks';
import { goalProgress, paceLabel } from '../domain/bodyGoal';
import { formatValue } from '../domain/measurements';
import { DungeonFloors, TodayMission } from '../components/TodayMission';
import { RankPortrait } from '../components/RankPortrait';
import { ChestArt } from '../components/ChestArt';
import { ChestOpening } from '../components/ChestOpening';
import { isOpened, loadOpened, withOpened } from '../ui/openedChests';
import { tierName } from '../domain/dailyRewards';
import { difficultyForXp, difficultyLabel } from '../domain/difficulty';
import { categoryLabel, formatDate, moveDate } from '../domain/rules';
import { loadPin, pendingFirst, pickMain, savePin } from '../ui/mainQuest';
import { isRunning, loadTimer } from '../ui/focusTimer';
import { exerciseByName, isLibraryLine, muscleLabel } from '../domain/exerciseLibrary';
import { hasGymHabit, nextGymSession } from '../domain/gymSession';
import { hasRecoveryHabit } from '../domain/standardPlan';
import { WeekPlan } from '../components/WeekPlan';
import { QuestSheet } from '../components/QuestSheet';
import { SceneArt } from '../components/SceneArt';
import { sceneForQuest } from '../domain/scene';
import type { SetLogApi } from '../components/SetLog';
import { metCount } from '../components/ObjectiveList';
import { EmptyState, IconBubble, ProgressBar } from '../components/primitives';
import { categoryColors, categoryIcons } from '../ui/categories';
import { dateText, number, pct } from '../ui/format';
import type { Tab } from '../ui/nav';

interface Props {
  dashboard: DailyDashboardDto | null;
  selectedDate: string; today: string; busyId: string | null;
  onSelectDate: (update: (date: string) => string) => void;
  onToggleQuest: (quest: QuestDto) => void; onSetObjective: (quest: QuestDto, objective: QuestObjectiveDto, value: number) => void; onNewHabit: () => void; onImportPlan?: () => void; /** adds the walks and stretching to a plan started without them (ADR-045) */ onAddRecovery?: () => void; setLog?: SetLogApi; loadDay?: (date: string) => Promise<DailyDashboardDto>; habits?: HabitDto[]; weekly?: AnalyticsDto | null; goTo: (tab: Tab) => void; /** the body goal (null: none yet, undefined: unknown) with the measurements its progress comes from */ bodyGoal?: BodyGoalDto | null; metrics?: MetricDto[];
}

/** One line of the body goal on Today: day N of the goal, the weights and the pace; a nudge to set a goal when there is none. */
function GoalStrip({ goal, metrics, today, onOpen }: { goal: BodyGoalDto | null; metrics: MetricDto[]; today: string; onOpen: () => void }) {
  if (!goal) return <button type="button" className="goal-strip is-empty" onClick={onOpen}><Target size={16} aria-hidden="true"/> Đặt mục tiêu cơ thể 100 ngày</button>;
  const p = goalProgress(goal, metrics, today);
  const weights = `${p.currentKg === null ? formatValue(goal.startWeightKg) : formatValue(p.currentKg)} → ${formatValue(goal.targetWeightKg)} kg`;
  return <button type="button" className="goal-strip" onClick={onOpen} aria-label={`Mục tiêu cơ thể: ${p.day === 0 ? 'chưa bắt đầu' : `ngày ${p.day} trên ${goal.days}`}, ${weights}, ${paceLabel[p.pace]}. Mở số đo`}>
    <span className="goal-strip-top"><span><Target size={15} aria-hidden="true"/> {p.finished ? 'Hết thời gian' : p.day === 0 ? 'Sắp bắt đầu' : `Ngày ${p.day}/${goal.days}`}</span><strong>{weights}</strong></span>
    <ProgressBar value={Math.round(p.fraction * 100)} variant="green" size="slim"/>
    <small className={`goal-pace is-${p.pace.toLowerCase().replace('_', '-')}`}>{paceLabel[p.pace]}</small>
  </button>;
}

/** A day with no task in a gym plan (Sunday): a real rest day with a few light habits and the weekly weigh-in, no XP and no streak impact (ADR-045). */
function RestDayCard({ onBody }: { onBody: () => void }) {
  return <article className="rest-day has-scene" aria-label="Ngày nghỉ">
    <SceneArt scene="MINDFULNESS"/>
    <h3><Moon size={17} aria-hidden="true"/> Ngày nghỉ</h3>
    <p>Cơ bắp lớn lên khi bạn nghỉ. Hôm nay không có nhiệm vụ và không ảnh hưởng chuỗi ngày.</p>
    <ul><li>Ngủ đủ 7–8 giờ.</li><li>Uống đủ nước, ăn đủ đạm.</li><li>Cân và ghi số đo tuần này để xem tiến độ.</li></ul>
    <button type="button" className="btn btn-secondary" onClick={onBody}>Mở số đo</button>
  </article>;
}

const Difficulty = ({ xp }: { xp: number }) => { const d = difficultyForXp(xp); return <span className={`diff-chip diff-${d.toLowerCase()}`} title="Độ khó chỉ để hiển thị, suy từ XP">{difficultyLabel[d]}</span>; };

/**
 * Today answers one question: what do I do next? A one-line summary, the next quest with a single button, then the full list.
 * Level, stats, balance and the campaign live in their own tabs.
 */
export function TodayPage({ dashboard, selectedDate, today, busyId, onSelectDate, onToggleQuest, onSetObjective, onNewHabit, onImportPlan, onAddRecovery, setLog, loadDay, habits, weekly, goTo, bodyGoal, metrics = [] }: Props) {
  const [showWeek, setShowWeek] = useState(false);
  const [opening, setOpening] = useState<DailyRewardDto | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [autoTrain, setAutoTrain] = useState(false); // the Main Quest's start button goes straight into the set-by-set screen for a gym session
  const detail = detailId ? dashboard?.quests.find(q => q.habitId === detailId) : undefined; // read from the live dashboard so the sheet never shows stale numbers
  const [opened, setOpened] = useState(loadOpened);
  const cur = dashboard?.progress;
  const total = dashboard?.scheduledCount || 0, done = dashboard?.completedCount || 0;
  const levelPct = cur ? pct(cur.totalXp - cur.levelStartXp, cur.nextLevelXp - cur.levelStartXp) : 0;
  const level = cur?.level || 1, stage = stageForLevel(level), rank = stage.rank;
  const toNextRank = xpToNextRank(level, cur?.totalXp ?? 0);
  const weeklyDone = weekly?.completedCount ?? 0, weeklyTotal = weekly?.scheduledCount ?? 0;
  const isToday = selectedDate === today;
  const [pinnedId, setPinnedId] = useState<string | null>(() => loadPin(selectedDate));
  useEffect(() => { setPinnedId(loadPin(selectedDate)); }, [selectedDate]);
  const pin = (id: string | null) => { savePin(selectedDate, id); setPinnedId(id); };
  const next = isToday ? pickMain(dashboard?.quests ?? [], pinnedId) : undefined;
  const allDone = isToday && total > 0 && !next;
  const rewards = dashboard?.dailyRewards ?? [];
  // A chest whose XP was taken back (undo) is forgotten, so earning it again is a fresh reveal.
  useEffect(() => {
    const stale = rewards.filter(r => r.state === 'LOCKED' && isOpened(opened, selectedDate, r.tier));
    if (stale.length) setOpened(prev => stale.reduce((acc, r) => withOpened(acc, selectedDate, r.tier, false), prev));
  }, [rewards, opened, selectedDate]);
  const nextChest = rewards.find(r => r.state === 'LOCKED');
  const rewardLabel = nextChest ? `Phần thưởng: ${tierName(nextChest.tier)}` : rewards.length ? 'Đã nhận hết rương hôm nay' : '';
  const unopened = rewards.some(r => r.state === 'EARNED' && !isOpened(opened, selectedDate, r.tier));
  const rewardHint = !rewards.length ? '' : (unopened ? 'Chạm vào rương để mở' + (nextChest ? ' · ' : '') : '') + (nextChest ? `Còn ${Math.max(1, nextChest.threshold - done)} nhiệm vụ để mở ${tierName(nextChest.tier)}` : unopened ? '' : 'Đã mở hết rương');
  // Gym nudge: no plan yet -> offer to load one; plan loaded but nothing to train today -> say when the next session is.
  const gymToday = (dashboard?.quests ?? []).some(q => q.objectives.some(isLibraryLine));
  const upcoming = habits && isToday && !gymToday ? nextGymSession(habits, today) : null;
  const gymNudge = !habits || !isToday || gymToday ? null
    : !hasGymHabit(habits) ? (onImportPlan ? <article className="panel gym-nudge" aria-label="Giáo án gym"><div><h3><Dumbbell size={17}/> Chưa có lịch tập</h3><p>Hệ thống sẽ nạp giáo án 3 buổi mỗi tuần cho bạn, rồi Hôm nay có buổi tập để ghi từng set và xem tiến độ.</p></div><button className="btn btn-primary" onClick={onImportPlan}>Bắt đầu hành trình</button></article> : null)
    : upcoming ? <article className="panel gym-nudge" aria-label="Buổi tập kế tiếp"><div><h3><Dumbbell size={17}/> Hôm nay không có buổi tập</h3><p>Buổi kế tiếp: <strong>{upcoming.habit.title}</strong> · {formatDate(upcoming.date, { weekday: 'long', day: 'numeric', month: 'numeric' })}{(() => { const g = [...new Set(upcoming.habit.objectives.map(o => exerciseByName(o.title)?.group).filter(Boolean))].map(x => muscleLabel[x!]); return g.length ? ` · ${g.join(', ')}` : ''; })()}</p></div>{loadDay && <button className="btn btn-quiet" onClick={() => setShowWeek(true)}>Xem lịch tuần</button>}</article> : null;
  // A plan started before the recovery days existed (ADR-045): offer to add the walks and stretching, from tomorrow.
  const recoveryOffer = habits && isToday && onAddRecovery && hasGymHabit(habits) && !hasRecoveryHabit(habits)
    ? <article className="panel gym-nudge" aria-label="Ngày hồi phục"><div><h3><Moon size={17}/> Thêm ngày hồi phục</h3><p>Đi bộ nhanh thứ 3 và thứ 7, giãn cơ thứ 5, chủ nhật nghỉ. Bắt đầu từ ngày mai, không đổi các ngày đã qua.</p></div><button className="btn btn-secondary" onClick={onAddRecovery}>Thêm ngày hồi phục</button></article> : null;
  const noPlan = !!habits && isToday && !gymToday && !hasGymHabit(habits);
  // A session with sets already on the server is "in progress": the main button resumes it instead of starting over.
  const nextIsGym = !!next && next.status !== 'COMPLETED' && next.objectives.some(isLibraryLine);
  const [daySets, setDaySets] = useState<WorkoutSetDto[]>([]);
  const loggedSets = daySets.length;
  useEffect(() => {
    if (!setLog || !nextIsGym || !next) { setDaySets([]); return; }
    let live = true;
    setLog.list(next.habitId, selectedDate).then(sets => { if (live) setDaySets(sets); }, () => { if (live) setDaySets([]); });
    return () => { live = false; };
  }, [setLog, nextIsGym, next?.habitId, selectedDate, detailId]); // eslint-disable-line react-hooks/exhaustive-deps
  const panel = detail ? <QuestSheet key={`${detail.habitId}:${autoTrain}`} autoTrain={autoTrain} setLog={setLog} quest={detail} date={selectedDate} busy={busyId === detail.habitId} onClose={() => { setDetailId(null); setAutoTrain(false); }} onToggle={onToggleQuest} onSetObjective={onSetObjective} main={next?.habitId === detail.habitId} pinned={pinnedId === detail.habitId} canPin={isToday} onPin={pin}/> : null;
  const listed = (dashboard?.quests ?? []).filter(q => !(nextIsGym && q.habitId === next?.habitId)); // the mission card already shows the main gym session
  const NextIcon = next ? categoryIcons[next.category] : null;
  return <>
    {showWeek && loadDay && <WeekPlan today={today} selectedDate={selectedDate} loadDay={loadDay} onPick={d => { onSelectDate(() => d); setShowWeek(false); }} onClose={() => setShowWeek(false)}/>}
    <header className="today-head"><div><span className="sys-eyebrow">{dateText(selectedDate).toUpperCase()}</span><h1>{isToday ? 'Cổng hôm nay' : 'Ngày đã chọn'}</h1></div>
      <span className="streak-chip" title="Số ngày liên tiếp hoàn thành ít nhất một nửa nhiệm vụ trong ngày"><Flame size={16} aria-hidden="true"/><span aria-label={`Chuỗi ${dashboard?.dayStreak || 0} ngày`}>{dashboard?.dayStreak || 0}</span></span></header>
    <button type="button" className="hunter-card" onClick={() => goTo('character')} aria-label={`Cấp ${level}, hạng ${rank}, ${stage.name}, xem nhân vật`}>
      <RankPortrait level={level} size={56}/>
      <span className="hunter-main">
        <b>Cấp {level} <em>· HẠNG {rank} · {stage.name.toUpperCase()}</em></b>
        <ProgressBar value={levelPct} variant="green" size="slim"/>
        <span className="hunter-row"><span>{number(cur?.totalXp || 0)} / {number(cur?.nextLevelXp || 0)} XP</span>{toNextRank && <span>Còn {number(toNextRank.xp)} XP lên Hạng {toNextRank.rank}</span>}</span>
      </span>
    </button>
    {bodyGoal !== undefined && <GoalStrip goal={bodyGoal} metrics={metrics} today={today} onOpen={() => goTo('body')}/>}
    <div className="today-simple">
      <div className="today-actions" role="group" aria-label="Lối tắt">
        {loadDay && <button type="button" className="btn btn-secondary" onClick={() => setShowWeek(true)}><CalendarDays size={16}/> Lịch tuần</button>}
        <button type="button" className="btn btn-secondary" onClick={() => goTo('exercises')}><BookOpen size={16}/> Bài tập</button>
      </div>
      {noPlan && gymNudge}
      {next && nextIsGym && <><TodayMission quest={next} sets={daySets} reward={rewardLabel} running={isRunning(loadTimer(next.habitId, selectedDate))} startLabel={loggedSets > 0 ? `Tiếp tục buổi tập · đã ghi ${loggedSets} set` : 'Bắt đầu buổi tập'} onStart={() => { setAutoTrain(true); setDetailId(next.habitId); }}/><DungeonFloors quest={next} sets={daySets} onOpen={() => { setAutoTrain(true); setDetailId(next.habitId); }}/></>}
      {next && NextIcon && !nextIsGym && <article className="next-up has-scene" aria-label="Việc tiếp theo">
        <SceneArt scene={sceneForQuest(next)}/>
        <div className="next-up-label">VIỆC CHÍNH HÔM NAY <Difficulty xp={next.xpReward}/></div>
        <div className="next-up-main"><IconBubble icon={NextIcon} tone={categoryColors[next.category]}/><div><h2>{next.title}</h2><small><Clock3 size={13}/> {next.targetMinutes} phút · {categoryLabel(next.category)}{next.objectives.length > 0 && ` · ${metCount(next.objectives)}/${next.objectives.length} việc`}</small></div><span className="next-up-xp"><Zap size={13}/> +{next.xpReward} XP</span></div>
        {next.objectives.length > 0 && <ProgressBar value={pct(metCount(next.objectives), next.objectives.length)} variant="green" size="slim"/>}
        {isRunning(loadTimer(next.habitId, selectedDate)) && <small className="timer-running" role="status"><Timer size={13}/> Đồng hồ buổi tập đang chạy</small>}
        <div className="next-up-actions">
          <button className="btn btn-primary next-up-start" onClick={() => { setAutoTrain(true); setDetailId(next.habitId); }}><ClipboardList size={17}/> {next.objectives.some(isLibraryLine) ? (loggedSets > 0 ? `Tiếp tục buổi tập · đã ghi ${loggedSets} set` : 'Bắt đầu buổi tập') : next.objectives.length > 0 ? 'Mở danh sách việc' : 'Xem chi tiết'}</button>
          {next.objectives.length === 0 && <button className="btn btn-quiet next-up-quick" disabled={busyId === next.habitId} onClick={() => onToggleQuest(next)}><Check size={16}/> Hoàn thành</button>}
        </div>
      </article>}
      {detail && next?.habitId === detail.habitId && panel}
      {!noPlan && gymNudge}
      {recoveryOffer}
      {allDone && <article className="next-up next-up-done" aria-label="Đã xong hôm nay">
        <div className="next-up-main"><PartyPopper size={28}/><div><h2>Bạn đã hoàn thành hết hôm nay.</h2><small>Nghỉ ngơi, hoặc xem nhân vật của bạn tiến bộ thế nào.</small></div></div>
        <button className="btn btn-secondary" onClick={() => goTo('character')}>Xem nhân vật</button>
      </article>}

      {!(nextIsGym && listed.length === 0) && <article className="panel quests-panel">
        <div className="quests-header"><div><h2>{nextIsGym ? 'Việc khác' : 'Việc hôm nay'} <span className="count-pill">{listed.length}</span></h2></div>
          <div className="date-controls"><button aria-label="Ngày trước" onClick={() => onSelectDate(d => moveDate(d, -1))}><ChevronLeft size={17}/></button><span>{isToday ? 'Hôm nay' : formatDate(selectedDate, { day: 'numeric', month: 'short' })}</span><button disabled={selectedDate >= today} aria-label="Ngày tiếp theo" onClick={() => onSelectDate(d => moveDate(d, 1))}><ChevronRight size={17}/></button></div></div>
        <div className="quest-list">{!listed.length
          ? (habits && hasGymHabit(habits) ? <RestDayCard onBody={() => goTo('body')}/> : <EmptyState icon={CalendarDays} title="Không có nhiệm vụ trong ngày này" details="Tạo một thói quen mới hoặc chọn ngày khác." action={<><button className="btn btn-secondary" onClick={onNewHabit}><Plus size={16}/> Tạo thói quen</button>{onImportPlan && <button className="btn btn-quiet" onClick={onImportPlan}><Dumbbell size={16}/> Nạp giáo án gym</button>}</>}/>)
          : pendingFirst(listed).map(q => { const renderQuest = () => {
            const Icon = categoryIcons[q.category]; const completed = q.status === 'COMPLETED';
            if (q.objectives.length > 0) {
              // A quest with a checklist is a card, not one big button: its lines are the controls.
              return <div key={q.habitId} data-status={completed ? 'done' : metCount(q.objectives) > 0 ? 'doing' : 'todo'} className={`quest-card has-scene ${completed ? 'is-done' : ''} ${next?.habitId === q.habitId ? 'is-next' : ''}`}>
                <SceneArt scene={sceneForQuest(q)}/>
                <div className="quest-card-head"><IconBubble icon={Icon} tone={categoryColors[q.category]}/><span className="quest-body"><strong>{q.title}</strong><small><Clock3 size={13}/> {q.targetMinutes} phút <i/> {categoryLabel(q.category)} <i/> {metCount(q.objectives)}/{q.objectives.length} việc <Difficulty xp={q.xpReward}/>{next?.habitId === q.habitId && <b className="main-tag">Trọng tâm</b>}</small></span><span className={`xp-tag ${completed ? 'earned' : ''}`}>{completed ? <Check size={13}/> : <Zap size={13}/>} {completed ? 'Xong' : `+${q.xpReward} XP`}</span><button type="button" className="quest-detail-btn" aria-label={`Chi tiết ${q.title}`} onClick={() => setDetailId(q.habitId)}><ClipboardList size={17}/></button></div>
              </div>;
            }
            return <div key={q.habitId} className="quest-row-wrap"><button className={`quest-row has-scene ${completed ? 'is-done' : ''} ${next?.habitId === q.habitId ? 'is-next' : ''}`} aria-label={`${completed ? 'Hoàn tác' : 'Hoàn thành'} nhiệm vụ ${q.title}, ${q.xpReward} XP`} aria-pressed={completed} disabled={busyId === q.habitId} onClick={() => onToggleQuest(q)}>
              <SceneArt scene={sceneForQuest(q)}/>
              <span className={`quest-check ${completed ? 'checked' : ''}`}>{completed ? <Check size={17}/> : <Circle size={19}/>}</span>
              <IconBubble icon={Icon} tone={categoryColors[q.category]}/>
              <span className="quest-body"><strong>{q.title}</strong><small><Clock3 size={13}/> {q.targetMinutes} phút <i/> {categoryLabel(q.category)} <Difficulty xp={q.xpReward}/>{next?.habitId === q.habitId && <b className="main-tag">Trọng tâm</b>}</small></span>
              <span className={`xp-tag ${completed ? 'earned' : ''}`}>{completed ? <Check size={13}/> : <Zap size={13}/>} {completed ? 'Xong' : `+${q.xpReward} XP`}</span>
            </button><button type="button" className="quest-detail-btn" aria-label={`Chi tiết ${q.title}`} onClick={() => setDetailId(q.habitId)}><ClipboardList size={17}/></button></div>;
          }; return <Fragment key={q.habitId}>{renderQuest()}{detail?.habitId === q.habitId && next?.habitId !== q.habitId && panel}</Fragment>; })}</div>
      </article>}
      <details className="panel today-more" open={unopened || undefined}>
        <summary>Tổng quan và phần thưởng</summary>
      <div className="today-tiles" aria-label="Tóm tắt hôm nay">
          <div className="today-tile" title="Số ngày liên tiếp hoàn thành ít nhất một nửa nhiệm vụ trong ngày"><Flame size={22}/><span><small>Chuỗi ngày</small><strong>{dashboard?.dayStreak || 0} ngày</strong></span></div>
          <div className="today-tile"><Zap size={22}/><span><small>{isToday ? 'XP hôm nay' : 'XP ngày này'}</small><strong>+{dashboard?.earnedXpToday || 0}</strong></span></div>
          <div className="today-tile" title="Nhiệm vụ đã xong trên số có lịch trong 7 ngày qua"><CalendarDays size={22}/><span><small>7 ngày qua</small><strong>{weeklyDone}/{weeklyTotal}</strong></span></div>
          <div className="today-tile"><Check size={22}/><span><small>Hôm nay</small><strong>{done}/{total}</strong></span></div>
        </div>

        {rewards.length > 0 && <section className="daily-rewards" aria-label={`Phần thưởng ${isToday ? 'hôm nay' : 'ngày này'}`}>
          <div className="daily-rewards-head"><strong>Phần thưởng {isToday ? 'hôm nay' : 'ngày này'}</strong><span>{rewardHint}</span></div>
          <ul>{rewards.map(r => {
            const ready = r.state === 'EARNED' && !isOpened(opened, selectedDate, r.tier);
            const label = `${tierName(r.tier)}: ${r.state === 'LOCKED' ? `mở khi xong ${r.threshold} nhiệm vụ` : ready ? 'chạm để mở' : 'đã mở'}, +${r.xp} XP`;
            const body = <><span className="chest-pic"><ChestArt tier={r.tier} open={r.state === 'EARNED' && !ready} size={78}/>{r.state === 'LOCKED' && <Lock className="chest-lock" size={16} aria-hidden="true"/>}</span><strong>{tierName(r.tier)}</strong><small>{r.state === 'LOCKED' ? `${r.threshold} nhiệm vụ · +${r.xp} XP` : ready ? 'Chạm để mở!' : `+${r.xp} XP`}</small></>;
            return <li key={r.tier}>{r.state === 'EARNED'
              ? <button className={`chest chest-${r.tier.toLowerCase()} is-open ${ready ? 'is-ready' : ''}`} aria-label={label} onClick={() => setOpening(r)}>{body}</button>
              : <div className={`chest chest-${r.tier.toLowerCase()}`} aria-label={label} role="group">{body}</div>}</li>;
          })}</ul>
        </section>}

      </details>
    </div>
    {opening && <ChestOpening reward={opening} onRevealed={() => setOpened(prev => withOpened(prev, selectedDate, opening.tier, true))} onClose={() => setOpening(null)}/>}
  </>;
}
