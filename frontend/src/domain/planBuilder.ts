import type { GoalDto, HabitDto, Weekday } from '../api/types';
import { exerciseById, isGymHabit, type Exercise, type MuscleGroup, type Program, type ProgramDay } from './exerciseLibrary';
import { infoFor } from './exerciseInfo';

/**
 * Builds a weekly gym program from three answers: the goal, where the person trains and how many sessions a week.
 * Pure data from the exercise library: the result is an ordinary `Program`, imported through the existing plan import, so it becomes
 * normal goals, habits and checklist lines (nothing new is stored, and the XP rules do not change).
 *
 * The numbers (reps, sets, rest) are general guidance for beginners and should be reviewed by a trainer.
 */
export type TrainingGoal = 'MUSCLE' | 'FAT_LOSS' | 'STRENGTH';
export type TrainPlace = 'GYM' | 'DUMBBELL' | 'HOME';
export type SessionCount = 2 | 3 | 4 | 5;
export interface PlanChoice { goal: TrainingGoal; place: TrainPlace; sessions: SessionCount; }

export const SESSION_OPTIONS: readonly SessionCount[] = [2, 3, 4, 5];
export const GOALS: Record<TrainingGoal, { label: string; summary: string; repsText: string; restText: string }> = {
  MUSCLE: { label: 'Tăng cơ', summary: 'Chia buổi theo nhóm cơ: đẩy, kéo, chân.', repsText: '8–12 rep', restText: 'Nghỉ 60–90 giây' },
  FAT_LOSS: { label: 'Giảm mỡ', summary: 'Toàn thân, nhịp nhanh, thêm động tác nhịp tim cao cuối buổi.', repsText: '12–15 rep', restText: 'Nghỉ 30–45 giây' },
  STRENGTH: { label: 'Khỏe hơn', summary: 'Ít bài, tập nặng dần: squat, đẩy, kéo.', repsText: '5–8 rep', restText: 'Nghỉ 2–3 phút' }
};
export const PLACES: Record<TrainPlace, { label: string; note: string }> = {
  GYM: { label: 'Phòng gym đủ máy', note: 'Máy, cáp, thanh đòn và tạ đơn.' },
  DUMBBELL: { label: 'Chỉ có tạ đơn', note: 'Tạ đơn và trọng lượng cơ thể.' },
  HOME: { label: 'Tại nhà', note: 'Chỉ trọng lượng cơ thể, thêm một chiếc ghế.' }
};
export const DAY_LABEL: Record<number, string> = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 7: 'CN' };

/** The least equipment an exercise needs: nothing (HOME), dumbbells (DUMBBELL) or a gym (GYM). A place can do its own level and the ones below it. */
type Level = 'HOME' | 'DUMBBELL' | 'GYM';
const LEVEL: Record<string, Level> = {
  'bench-press': 'GYM', 'incline-db-press': 'GYM', 'cable-fly': 'GYM', 'push-up': 'HOME', 'chest-dip': 'GYM',
  'pull-up': 'GYM', 'barbell-row': 'GYM', 'lat-pulldown': 'GYM', 'seated-row': 'GYM', deadlift: 'GYM',
  'back-squat': 'GYM', 'romanian-deadlift': 'GYM', 'leg-press': 'GYM', 'walking-lunge': 'HOME', 'calf-raise': 'HOME',
  'overhead-press': 'GYM', 'lateral-raise': 'DUMBBELL', 'rear-delt-fly': 'DUMBBELL', 'face-pull': 'GYM',
  'barbell-curl': 'GYM', 'hammer-curl': 'DUMBBELL', 'triceps-pushdown': 'GYM', 'skull-crusher': 'GYM', 'overhead-triceps': 'DUMBBELL',
  'machine-chest-press': 'GYM', 'seated-leg-curl': 'GYM', 'leg-extension': 'GYM', 'goblet-squat': 'DUMBBELL', 'db-romanian-deadlift': 'DUMBBELL',
  'machine-shoulder-press': 'GYM', 'db-lateral-raise': 'DUMBBELL', 'dead-bug': 'HOME', plank: 'HOME', 'hanging-leg-raise': 'GYM', 'cable-crunch': 'GYM',
  'bodyweight-squat': 'HOME', 'glute-bridge': 'HOME', superman: 'HOME', 'pike-push-up': 'HOME', 'bench-dip': 'HOME',
  'db-floor-press': 'DUMBBELL', 'db-row': 'DUMBBELL', 'db-shoulder-press': 'DUMBBELL', 'db-curl': 'DUMBBELL', 'bird-dog': 'HOME', 'mountain-climber': 'HOME'
};
const RANK: Record<Level, number> = { HOME: 0, DUMBBELL: 1, GYM: 2 };
export const levelOf = (id: string): Level => LEVEL[id] ?? 'GYM'; // an unknown exercise is treated as needing a gym, never offered at home
const canDo = (place: TrainPlace, id: string) => RANK[levelOf(id)] <= RANK[place];

/** What a slot of a session is for. Each role lists exercises in order of preference (machines and dumbbells first, for beginners). */
type Role = 'LEG_SQ' | 'LEG_HINGE' | 'LEG_ACC' | 'LEG_ACC2' | 'CHEST_MAIN' | 'CHEST_ACC' | 'CHEST_ACC2' | 'BACK_V' | 'BACK_H' | 'BACK_H2'
  | 'SH_PRESS' | 'SH_ACC' | 'SH_ACC2' | 'BI' | 'BI2' | 'TRI' | 'TRI2' | 'CORE' | 'CORE2';
const ROLES: Record<Role, readonly string[]> = {
  LEG_SQ: ['leg-press', 'goblet-squat', 'back-squat', 'bodyweight-squat'],
  LEG_HINGE: ['db-romanian-deadlift', 'romanian-deadlift', 'glute-bridge'],
  LEG_ACC: ['leg-extension', 'seated-leg-curl', 'walking-lunge', 'calf-raise'],
  LEG_ACC2: ['seated-leg-curl', 'walking-lunge', 'calf-raise', 'glute-bridge'],
  CHEST_MAIN: ['machine-chest-press', 'bench-press', 'db-floor-press', 'push-up'],
  CHEST_ACC: ['incline-db-press', 'cable-fly', 'db-floor-press', 'push-up'],
  CHEST_ACC2: ['cable-fly', 'push-up', 'db-floor-press', 'incline-db-press'],
  BACK_V: ['lat-pulldown', 'pull-up', 'superman'],
  BACK_H: ['seated-row', 'barbell-row', 'db-row', 'superman'],
  BACK_H2: ['face-pull', 'rear-delt-fly', 'superman'],
  SH_PRESS: ['machine-shoulder-press', 'overhead-press', 'db-shoulder-press', 'pike-push-up'],
  SH_ACC: ['lateral-raise', 'db-lateral-raise', 'rear-delt-fly', 'face-pull', 'pike-push-up'],
  SH_ACC2: ['rear-delt-fly', 'face-pull', 'lateral-raise'],
  BI: ['barbell-curl', 'db-curl', 'hammer-curl'],
  BI2: ['hammer-curl', 'db-curl', 'barbell-curl'],
  TRI: ['triceps-pushdown', 'overhead-triceps', 'bench-dip'],
  TRI2: ['overhead-triceps', 'skull-crusher', 'bench-dip'],
  CORE: ['plank', 'dead-bug', 'cable-crunch', 'bird-dog'],
  CORE2: ['hanging-leg-raise', 'cable-crunch', 'dead-bug', 'bird-dog', 'plank']
};
/** For "Khỏe hơn" the heavy lifts come first: barbell squat, bench, row, press, Romanian deadlift. */
const STRONG: Partial<Record<Role, readonly string[]>> = {
  LEG_SQ: ['back-squat', 'goblet-squat', 'bodyweight-squat'],
  LEG_HINGE: ['romanian-deadlift', 'db-romanian-deadlift', 'glute-bridge'],
  CHEST_MAIN: ['bench-press', 'db-floor-press', 'push-up'],
  BACK_H: ['barbell-row', 'db-row', 'superman'],
  SH_PRESS: ['overhead-press', 'db-shoulder-press', 'pike-push-up']
};

interface Template { name: string; roles: readonly Role[]; }
const FULL_A: Template = { name: 'Toàn thân A', roles: ['LEG_SQ', 'CHEST_MAIN', 'BACK_H', 'SH_PRESS', 'CORE'] };
const FULL_B: Template = { name: 'Toàn thân B', roles: ['LEG_HINGE', 'CHEST_ACC', 'BACK_V', 'SH_ACC', 'CORE2'] };
const FULL_C: Template = { name: 'Toàn thân C', roles: ['LEG_ACC', 'CHEST_MAIN', 'BACK_V', 'SH_PRESS', 'CORE2'] };
const PUSH: Template = { name: 'Đẩy', roles: ['CHEST_MAIN', 'SH_PRESS', 'CHEST_ACC', 'SH_ACC', 'TRI'] };
const PULL: Template = { name: 'Kéo', roles: ['BACK_V', 'BACK_H', 'SH_ACC2', 'BI', 'CORE'] };
const LEGS: Template = { name: 'Chân', roles: ['LEG_SQ', 'LEG_HINGE', 'LEG_ACC', 'LEG_ACC2', 'CORE'] };
const UPPER_A: Template = { name: 'Thân trên A', roles: ['CHEST_MAIN', 'BACK_H', 'SH_PRESS', 'BI', 'TRI'] };
const UPPER_B: Template = { name: 'Thân trên B', roles: ['CHEST_ACC', 'BACK_V', 'SH_ACC', 'BI2', 'TRI2'] };
const LOWER_A: Template = { name: 'Chân A', roles: ['LEG_SQ', 'LEG_HINGE', 'LEG_ACC', 'LEG_ACC2', 'CORE'] };
const LOWER_B: Template = { name: 'Chân B', roles: ['LEG_HINGE', 'LEG_ACC2', 'LEG_SQ', 'LEG_ACC', 'CORE2'] };
const CHEST_DAY: Template = { name: 'Ngực + Tay sau', roles: ['CHEST_MAIN', 'CHEST_ACC', 'CHEST_ACC2', 'TRI', 'TRI2'] };
const BACK_DAY: Template = { name: 'Lưng + Tay trước', roles: ['BACK_V', 'BACK_H', 'BACK_H2', 'BI', 'BI2'] };
const SHOULDER_DAY: Template = { name: 'Vai + Bụng', roles: ['SH_PRESS', 'SH_ACC', 'SH_ACC2', 'CORE', 'CORE2'] };
const STRENGTH_LOWER: Template = { name: 'Chân nặng', roles: ['LEG_SQ', 'LEG_HINGE', 'LEG_ACC', 'CORE'] };
const STRENGTH_UPPER: Template = { name: 'Thân trên nặng', roles: ['CHEST_MAIN', 'BACK_H', 'SH_PRESS', 'BACK_V'] };

const FULL_CYCLE = [FULL_A, FULL_B, FULL_C, FULL_A, FULL_B];
function templatesFor({ goal, place, sessions }: PlanChoice): Template[] {
  // At home there is too little gear for a push / pull split, so every session is full body.
  if (place === 'HOME' || goal === 'FAT_LOSS') return FULL_CYCLE.slice(0, sessions);
  if (goal === 'STRENGTH') {
    if (sessions <= 3) return FULL_CYCLE.slice(0, sessions);
    return sessions === 4 ? [STRENGTH_LOWER, STRENGTH_UPPER, { ...STRENGTH_LOWER, name: 'Chân nặng B', roles: ['LEG_HINGE', 'LEG_SQ', 'LEG_ACC2', 'CORE2'] }, { ...STRENGTH_UPPER, name: 'Thân trên nặng B', roles: ['CHEST_ACC', 'BACK_V', 'SH_PRESS', 'BACK_H'] }]
      : [STRENGTH_LOWER, { name: 'Đẩy nặng', roles: ['CHEST_MAIN', 'SH_PRESS', 'CHEST_ACC', 'TRI'] }, { name: 'Kéo nặng', roles: ['BACK_V', 'BACK_H', 'BI', 'CORE'] }, { ...STRENGTH_LOWER, name: 'Chân nặng B', roles: ['LEG_HINGE', 'LEG_SQ', 'LEG_ACC2', 'CORE2'] }, STRENGTH_UPPER];
  }
  switch (sessions) {
    case 2: return [FULL_A, FULL_B];
    case 3: return [PUSH, PULL, LEGS];
    case 4: return [UPPER_A, LOWER_A, UPPER_B, LOWER_B];
    default: return [CHEST_DAY, BACK_DAY, LEGS, SHOULDER_DAY, FULL_C];
  }
}

const WEEKDAYS: Record<SessionCount, Weekday[]> = { 2: [1, 4], 3: [1, 3, 6], 4: [1, 2, 4, 6], 5: [1, 2, 3, 5, 6] };
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/** Sets and reps for an exercise under a goal. Holds are in seconds; everything else is in repetitions. */
function prescription(goal: TrainingGoal, e: Exercise): { sets: number; reps: number } {
  if (e.unit === 'giây') return { sets: 3, reps: goal === 'MUSCLE' ? 40 : 30 };
  const kind = infoFor(e).kind;
  if (goal === 'MUSCLE') return kind === 'COMPOUND' ? { sets: 3, reps: 10 } : { sets: 3, reps: 12 };
  if (goal === 'FAT_LOSS') return kind === 'COMPOUND' ? { sets: 3, reps: 15 } : kind === 'CORE' ? { sets: 2, reps: 12 } : { sets: 2, reps: 15 };
  return kind === 'COMPOUND' ? { sets: 4, reps: 6 } : { sets: 2, reps: 8 };
}

/** Rest between sets for an exercise under a goal, in seconds: long for heavy strength work, short for fat loss. */
export function restSecondsFor(goal: TrainingGoal, e: Exercise): number {
  const main = infoFor(e).kind === 'COMPOUND';
  if (goal === 'STRENGTH') return main ? 150 : 120;
  if (goal === 'MUSCLE') return main ? 90 : 60;
  return main ? 45 : 30;
}

const GOAL_PREFIX = 'Gym — ';
/** The training goal a plan was built for, read from the goal title ("Gym — Tăng cơ · ..."); undefined for anything else, e.g. a plan the user renamed. */
export function goalFromTitle(title: string | undefined): TrainingGoal | undefined {
  if (!title?.startsWith(GOAL_PREFIX)) return undefined;
  const rest = title.slice(GOAL_PREFIX.length);
  return (Object.keys(GOALS) as TrainingGoal[]).find(g => rest === GOALS[g].label || rest.startsWith(`${GOALS[g].label} ·`));
}

function pick(role: Role, choice: PlanChoice, used: Set<string>): string | undefined {
  const list = (choice.goal === 'STRENGTH' && STRONG[role]) || ROLES[role];
  return list.find(id => canDo(choice.place, id) && !used.has(id));
}

export function buildProgram(choice: PlanChoice): Program {
  const goal = GOALS[choice.goal], place = PLACES[choice.place];
  const templates = templatesFor(choice);
  const days: ProgramDay[] = templates.map((t, i) => {
    const used = new Set<string>(), ids: string[] = [];
    for (const role of t.roles) { const id = pick(role, choice, used); if (id) { used.add(id); ids.push(id); } }
    // Fat loss ends every session with a short high-heart-rate finisher.
    if (choice.goal === 'FAT_LOSS' && !used.has('mountain-climber') && ids.length < 6) ids.push('mountain-climber');
    const overrides = Object.fromEntries(ids.map(id => [id, prescription(choice.goal, exerciseById(id))]));
    const groups = [...new Set(ids.map(id => exerciseById(id).group))] as MuscleGroup[];
    return { title: `Buổi ${LETTERS[i]} — ${t.name}`, weekdays: [WEEKDAYS[choice.sessions][i]], groups, exerciseIds: ids, overrides };
  });
  // About 40 seconds of work plus the rest per set, plus a warm-up; to the nearest 5 minutes.
  const minutes = Math.max(...days.map(d => { const secs = d.exerciseIds.reduce((sum, id) => { const e = exerciseById(id), p = d.overrides![id]; return sum + p.sets * (40 + restSecondsFor(choice.goal, e)); }, 0); return Math.min(90, Math.max(20, Math.round((secs / 60 + 5) / 5) * 5)); }));
  return {
    id: `custom-${choice.goal.toLowerCase()}-${choice.place.toLowerCase()}-${choice.sessions}`,
    name: `${goal.label} · ${place.label} · ${choice.sessions} buổi/tuần`,
    description: `${goal.summary} ${goal.repsText}, ${goal.restText.toLowerCase()}. ${place.note}`,
    goalNote: `Mục tiêu ${goal.label.toLowerCase()}, ${place.label.toLowerCase()}, ${choice.sessions} buổi mỗi tuần. ${goal.repsText}, ${goal.restText.toLowerCase()}. Các ngày còn lại là ngày nghỉ, không tạo nhiệm vụ nên không bị tính là bỏ lỡ.`,
    sessionMinutes: minutes, sessionXp: 50, days
  };
}

/**
 * What a new plan replaces: the active gym sessions (so two plans never put two sessions on the same day), and the goals that hold nothing but them.
 * A goal that also has non-gym habits stays; only its gym habits are archived.
 */
export function replacementFor(goals: readonly GoalDto[], habits: readonly HabitDto[]): { goalIds: string[]; habitIds: string[] } {
  const gym = habits.filter(h => h.status === 'ACTIVE' && isGymHabit(h));
  const goalIds = [...new Set(gym.map(h => h.goalId))].filter(id => {
    const goal = goals.find(g => g.id === id);
    return !!goal && goal.status === 'ACTIVE' && habits.filter(h => h.goalId === id && h.status === 'ACTIVE').every(h => isGymHabit(h));
  });
  return { goalIds, habitIds: gym.map(h => h.id) };
}
