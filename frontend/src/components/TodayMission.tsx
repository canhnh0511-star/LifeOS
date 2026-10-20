import { ChevronRight, ClipboardList, Timer, Zap } from 'lucide-react';
import type { QuestDto, WorkoutSetDto } from '../api/types';
import { plannedLines } from '../domain/gymSession';
import { infoFor } from '../domain/exerciseInfo';
import type { Exercise } from '../domain/exerciseLibrary';
import { SysPanel } from './SysPanel';
import { SceneArt } from './SceneArt';

const mineOf = (sets: readonly WorkoutSetDto[], e: Exercise) => sets.filter(s => s.exercise.toLowerCase() === e.name.toLowerCase());
const isDone = (sets: readonly WorkoutSetDto[], e: Exercise) => mineOf(sets, e).length >= e.sets;
const unitText = (e: Exercise) => e.unit === 'giây' ? `${e.reps} giây` : `${e.reps} rep`;

/** The day's mission (designed "Nhiệm vụ hàng ngày"): the gym session with its floors done, reward and the one start button. */
export function TodayMission({ quest, sets, reward, running, startLabel, onStart }: { quest: QuestDto; sets: readonly WorkoutSetDto[]; reward: string; running: boolean; startLabel: string; onStart: () => void }) {
  const floors = plannedLines(quest.objectives), done = floors.filter(e => isDone(sets, e)).length;
  return <SysPanel label="NHIỆM VỤ HÀNG NGÀY" tone="cyan" className="mission">
    <div className="mission-top"><div><h2>{quest.title}</h2><p>{floors.length} bài · khoảng {quest.targetMinutes} phút</p></div><span className="mission-xp"><Zap size={14} aria-hidden="true"/> +{quest.xpReward} XP</span></div>
    <div className="mission-meta"><span>Đã xong {done}/{floors.length} bài</span>{reward && <span>{reward}</span>}</div>
    <div className="mission-segs" role="progressbar" aria-label="Tiến độ buổi tập" aria-valuemin={0} aria-valuemax={floors.length} aria-valuenow={done}>{floors.map(e => <i key={e.id} className={isDone(sets, e) ? 'is-done' : ''}/>)}</div>
    {running && <small className="timer-running" role="status"><Timer size={13}/> Đồng hồ buổi tập đang chạy</small>}
    <button type="button" className="btn btn-primary mission-start" onClick={onStart}><ClipboardList size={17}/> {startLabel}</button>
  </SysPanel>;
}

/** The session's exercises as dungeon floors, in order; the first unfinished one is "Tiếp theo". Opening a floor goes into the workout. */
export function DungeonFloors({ quest, sets, onOpen }: { quest: QuestDto; sets: readonly WorkoutSetDto[]; onOpen: () => void }) {
  const floors = plannedLines(quest.objectives), current = floors.findIndex(e => !isDone(sets, e));
  return <section className="dungeon" aria-label="Hầm ngục hôm nay">
    <header><h3>HẦM NGỤC HÔM NAY</h3><span>{floors.length} tầng</span></header>
    <ol>{floors.map((e, i) => <li key={e.id} className={isDone(sets, e) ? 'is-done' : i === current ? 'is-current' : ''}>
      <button type="button" className="has-scene" onClick={onOpen} aria-label={`Tầng ${i + 1}: ${e.nameVi ?? e.name}${isDone(sets, e) ? ', đã xong' : ''}`}>
        <SceneArt scene={e.group}/>
        <span className="dungeon-n">{i + 1}</span>
        <span className="dungeon-body"><strong>{e.nameVi ?? e.name}</strong><small>{e.sets} set · {unitText(e)} · {infoFor(e).equipment}</small></span>
        {i === current ? <span className="dungeon-next">Tiếp theo</span> : <ChevronRight size={16} aria-hidden="true"/>}
      </button></li>)}</ol>
  </section>;
}
