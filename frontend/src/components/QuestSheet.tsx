import { useEffect, useState } from 'react';
import { Check, Clock3, Pause, Pin, PinOff, Play, RotateCcw, Timer, Undo2, Zap } from 'lucide-react';
import type { QuestDto, QuestObjectiveDto } from '../api/types';
import { difficultyForXp, difficultyLabel } from '../domain/difficulty';
import { categoryLabel } from '../domain/rules';
import { exerciseByName } from '../domain/exerciseLibrary';
import { clock, elapsedMs, isRunning, loadTimer, pauseTimer, saveTimer, startTimer, idleTimer, type TimerState } from '../ui/focusTimer';
import { Modal } from './Modal';
import { ExerciseSets, useSetLog, type SetLogApi } from './SetLog';
import { ObjectiveList, metCount } from './ObjectiveList';

const REST_PRESETS = [60, 90, 120];

interface Props { quest: QuestDto; date: string; busy: boolean; onClose: () => void; onToggle: (quest: QuestDto) => void; onSetObjective: (quest: QuestDto, objective: QuestObjectiveDto, value: number) => void; setLog?: SetLogApi; main?: boolean; pinned?: boolean; canPin?: boolean; onPin?: (habitId: string | null) => void; }

/**
 * Quest detail (RPG-03): the checklist, a session stopwatch and a rest countdown, and an explicit confirm button.
 * Timers are local aids. Starting, pausing or finishing one never completes the quest or awards XP; only the confirm button does.
 */
export function QuestSheet({ quest, date, busy, onClose, onToggle, onSetObjective, setLog, main = false, pinned = false, canPin = false, onPin }: Props) {
  const [timer, setTimer] = useState<TimerState>(() => loadTimer(quest.habitId, date));
  const [now, setNow] = useState(() => Date.now());
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const log = useSetLog(setLog, quest.habitId, date);
  const loggable = setLog ? quest.objectives.map(o => exerciseByName(o.title)).filter((e): e is NonNullable<typeof e> => !!e) : [];
  const done = quest.status === 'COMPLETED';
  const running = isRunning(timer), resting = restEndsAt !== null && restEndsAt > now;
  useEffect(() => { if (!running && !resting) return; const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, [running, resting]);
  const restOver = restEndsAt !== null && restEndsAt <= now;
  // A short buzz when the rest is over (phones that support it); the visible message below is the main signal.
  useEffect(() => { if (restOver) try { navigator.vibrate?.([200, 100, 200]); } catch { /* not supported */ } }, [restOver]);
  const change = (next: TimerState) => { setTimer(next); saveTimer(quest.habitId, date, next); setNow(Date.now()); };
  const restLeft = restEndsAt === null ? 0 : Math.max(0, Math.ceil((restEndsAt - now) / 1000));
  const d = difficultyForXp(quest.xpReward);
  // The exercise to do next (first line not yet met) and the rest the plan suggests for it, when it is a known library exercise.
  const nextLine = quest.objectives.find(o => o.value < o.target);
  const suggested = nextLine ? exerciseByName(nextLine.title) : undefined;
  const suggestedRest = suggested?.restSeconds;
  return <Modal title={quest.title} onClose={onClose} sheet>
    <div className="sheet">
      <p className="sheet-meta"><Clock3 size={14}/> {quest.targetMinutes} phút · {categoryLabel(quest.category)} · <Zap size={14}/> {done ? 'Đã nhận' : '+'}{quest.xpReward} XP <span className={`diff-chip diff-${d.toLowerCase()}`}>{difficultyLabel[d]}</span></p>
      {quest.objectives.length > 0 && <section aria-label="Bài tập">
        <h3 className="sheet-h">Bài tập · {metCount(quest.objectives)}/{quest.objectives.length}</h3>
        <ObjectiveList quest={quest} disabled={busy} onSet={(o, v) => onSetObjective(quest, o, v)}/>
      </section>}
      {setLog && loggable.length > 0 && <section aria-label="Nhật ký set">
        <h3 className="sheet-h">Nhật ký set</h3>
        <ul className="set-log">{loggable.map(e => <ExerciseSets key={e.id} exercise={e} sets={log.sets} date={date} busy={log.busy} last={setLog.last} onRecord={log.record} onRemove={log.remove}/>)}</ul>
        {log.error && <p role="alert" className="set-error">{log.error}</p>}
        <p className="form-note">Ghi lại bạn đã làm gì, không cộng XP và không tự hoàn thành buổi tập. Hoàn thành vẫn bằng nút xác nhận bên dưới.</p>
      </section>}
      <section aria-label="Đồng hồ buổi tập" className="sheet-timer">
        <h3 className="sheet-h"><Timer size={15}/> Đồng hồ buổi tập</h3>
        <div className="sheet-clock" role="timer" aria-live="off">{clock(elapsedMs(timer, now) / 1000)}</div>
        <div className="sheet-actions">
          {running
            ? <button className="btn btn-secondary" onClick={() => change(pauseTimer(timer, Date.now()))}><Pause size={16}/> Tạm dừng</button>
            : <button className="btn btn-secondary" onClick={() => change(startTimer(timer, Date.now()))}><Play size={16}/> {timer.accumulatedMs > 0 ? 'Tiếp tục' : 'Bắt đầu'}</button>}
          <button className="btn btn-quiet" disabled={!running && timer.accumulatedMs === 0} onClick={() => change(idleTimer)}><RotateCcw size={16}/> Đặt lại</button>
        </div>
        <p className="form-note">Đồng hồ chỉ để bạn theo dõi, không tự hoàn thành nhiệm vụ và không cộng XP.</p>
      </section>
      <section aria-label="Nghỉ giữa set" className="sheet-timer">
        <h3 className="sheet-h">Nghỉ giữa set</h3>
        {resting && <div className="sheet-clock" role="timer" aria-live="off">{clock(restLeft)}</div>}
        {restOver && <p role="status">Hết giờ nghỉ, vào set tiếp theo.</p>}
        <div className="sheet-actions">
          {suggestedRest && <button className="btn btn-primary" onClick={() => { setNow(Date.now()); setRestEndsAt(Date.now() + suggestedRest * 1000); }}>Nghỉ {suggestedRest} giây · {suggested!.name}</button>}
          {REST_PRESETS.map(s => <button key={s} className="btn btn-quiet" onClick={() => { setNow(Date.now()); setRestEndsAt(Date.now() + s * 1000); }}>{s} giây</button>)}
          {resting && <button className="btn btn-quiet" onClick={() => setRestEndsAt(null)}>Bỏ qua</button>}
        </div>
      </section>
      {canPin && onPin && !done && (pinned
        ? <button className="btn btn-quiet" onClick={() => onPin(null)}><PinOff size={16}/> Bỏ ghim nhiệm vụ trọng tâm</button>
        : !main && <button className="btn btn-quiet" onClick={() => onPin(quest.habitId)}><Pin size={16}/> Đặt làm nhiệm vụ trọng tâm</button>)}
      {done
        ? (confirmUndo
          ? <div className="sheet-confirm" role="group" aria-label="Xác nhận hoàn tác"><p>Hoàn tác sẽ trừ lại {quest.xpReward} XP đã nhận. Bạn chắc chứ?</p>
              <div className="sheet-actions"><button className="btn btn-danger" disabled={busy} onClick={() => { onToggle(quest); setConfirmUndo(false); }}><Undo2 size={16}/> Hoàn tác</button><button className="btn btn-quiet" onClick={() => setConfirmUndo(false)}>Giữ nguyên</button></div></div>
          : <button className="btn btn-secondary" disabled={busy} onClick={() => setConfirmUndo(true)}><Undo2 size={16}/> Hoàn tác</button>)
        : <button className="btn btn-primary" disabled={busy} onClick={() => onToggle(quest)}><Check size={17}/> Xác nhận hoàn thành</button>}
    </div>
  </Modal>;
}
