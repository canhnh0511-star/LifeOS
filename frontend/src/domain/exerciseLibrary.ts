import type { ImportHabitPlanRequest, ObjectiveInput, Weekday } from '../api/types';

/**
 * Static gym content (B-32): exercises by muscle group and a few ready-made weekly programs.
 * Names are the canonical exercise names that the set log (B-34) will use. Everything here is data on the client; a program becomes real
 * only when the user imports it, through the existing import call, and then it is ordinary goals, habits and checklist lines.
 */
export type MuscleGroup = 'CHEST' | 'BACK' | 'LEGS' | 'SHOULDERS' | 'ARMS' | 'CORE';
export const muscleLabel: Record<MuscleGroup, string> = { CHEST: 'Ngực', BACK: 'Lưng', LEGS: 'Chân', SHOULDERS: 'Vai', ARMS: 'Tay', CORE: 'Bụng' };

export interface Exercise { id: string; name: string; group: MuscleGroup; sets: number; reps: number; /** what one rep counts: repetitions or seconds held */ unit: 'rep' | 'giây'; /** shown next to the numbers, e.g. "mỗi bên" */ note?: string; /** suggested rest between sets, from the week-1 plan */ restSeconds?: number; }
const ex = (id: string, name: string, group: MuscleGroup, sets: number, reps: number, unit: Exercise['unit'] = 'rep', note?: string): Exercise => ({ id, name, group, sets, reps, unit, ...(note ? { note } : {}) });
/** Rest between sets (seconds) for the exercises of the week-1 plan (docs/LifeOS_Gym_Week1_2026-10-19.json). */
const REST: Record<string, number> = { 'machine-chest-press': 90, 'incline-db-press': 90, 'seated-row': 90, 'leg-press': 90, 'dead-bug': 60, 'goblet-squat': 90, 'lat-pulldown': 90, 'db-romanian-deadlift': 90, 'machine-shoulder-press': 90, plank: 60, 'seated-leg-curl': 75, 'leg-extension': 75, 'db-lateral-raise': 60 };

export const EXERCISES: readonly Exercise[] = [
  ex('bench-press', 'Barbell Bench Press', 'CHEST', 4, 8), ex('incline-db-press', 'Incline Dumbbell Press', 'CHEST', 3, 10), ex('cable-fly', 'Cable Fly', 'CHEST', 3, 12), ex('push-up', 'Push-up', 'CHEST', 3, 15), ex('chest-dip', 'Chest Dip', 'CHEST', 3, 10),
  ex('pull-up', 'Pull-up', 'BACK', 4, 8), ex('barbell-row', 'Barbell Row', 'BACK', 4, 8), ex('lat-pulldown', 'Lat Pulldown', 'BACK', 3, 10), ex('seated-row', 'Seated Cable Row', 'BACK', 3, 12), ex('deadlift', 'Deadlift', 'BACK', 3, 5),
  ex('back-squat', 'Back Squat', 'LEGS', 4, 8), ex('romanian-deadlift', 'Romanian Deadlift', 'LEGS', 3, 10), ex('leg-press', 'Leg Press', 'LEGS', 3, 12), ex('walking-lunge', 'Walking Lunge', 'LEGS', 3, 12), ex('calf-raise', 'Calf Raise', 'LEGS', 4, 15),
  ex('overhead-press', 'Overhead Press', 'SHOULDERS', 4, 8), ex('lateral-raise', 'Lateral Raise', 'SHOULDERS', 3, 15), ex('rear-delt-fly', 'Rear Delt Fly', 'SHOULDERS', 3, 15), ex('face-pull', 'Face Pull', 'SHOULDERS', 3, 15),
  ex('barbell-curl', 'Barbell Curl', 'ARMS', 3, 10), ex('hammer-curl', 'Hammer Curl', 'ARMS', 3, 12), ex('triceps-pushdown', 'Triceps Pushdown', 'ARMS', 3, 12), ex('skull-crusher', 'Skull Crusher', 'ARMS', 3, 10), ex('overhead-triceps', 'Overhead Triceps Extension', 'ARMS', 3, 12),
  ex('machine-chest-press', 'Machine Chest Press', 'CHEST', 2, 10), ex('seated-leg-curl', 'Seated Leg Curl', 'LEGS', 2, 10), ex('leg-extension', 'Leg Extension', 'LEGS', 2, 12),
  ex('goblet-squat', 'Goblet Squat', 'LEGS', 2, 10), ex('db-romanian-deadlift', 'Dumbbell Romanian Deadlift', 'LEGS', 2, 10), ex('machine-shoulder-press', 'Seated Machine Shoulder Press', 'SHOULDERS', 2, 10),
  ex('db-lateral-raise', 'Dumbbell Lateral Raise', 'SHOULDERS', 2, 12), ex('dead-bug', 'Dead Bug', 'CORE', 2, 8, 'rep', 'mỗi bên'),
  ex('plank', 'Plank', 'CORE', 3, 45, 'giây'), ex('hanging-leg-raise', 'Hanging Leg Raise', 'CORE', 3, 12), ex('cable-crunch', 'Cable Crunch', 'CORE', 3, 15)
];
const byId = new Map(EXERCISES.map(e => [e.id, { ...e, ...(REST[e.id] ? { restSeconds: REST[e.id] } : {}) } as Exercise]));
const byName = new Map([...byId.values()].map(e => [e.name.toLowerCase(), e]));
/** The library entry for a checklist line, by its exercise name (how the set log will recognise it too). */
export const exerciseByName = (name: string): Exercise | undefined => byName.get(name.trim().toLowerCase());
export const exerciseById = (id: string): Exercise => { const e = byId.get(id); if (!e) throw new Error(`Unknown exercise ${id}`); return e; };
export const exercisesFor = (group: MuscleGroup): Exercise[] => EXERCISES.filter(e => e.group === group);

export interface ProgramDay { title: string; weekdays: Weekday[]; groups: MuscleGroup[]; exerciseIds: string[]; /** this program's own sets and reps for an exercise, instead of the library default */ overrides?: Record<string, { sets: number; reps: number }>; }
export interface Program { id: string; name: string; description: string; /** goal description when it should say more than the card does (rest days, effort) */ goalNote?: string; sessionMinutes?: number; sessionXp?: number; days: ProgramDay[]; }
/** The exercise as this day prescribes it. */
export function prescribed(day: ProgramDay, id: string): Exercise { const e = exerciseById(id); const o = day.overrides?.[id]; return o ? { ...e, ...o } : e; }

export const PROGRAMS: readonly Program[] = [
  { id: 'week1-return', name: 'Tuần 1 — quay lại tập (45 phút)', description: 'Thứ 2, 4, 6, cường độ nhẹ cho người quay lại sau thời gian nghỉ. Mỗi buổi 5 bài, 2 set.',
    goalNote: 'Tuần 1 quay lại tập: 3 buổi toàn thân (thứ 2, 4, 6), tạ nhẹ còn 3–4 lần lặp dự trữ. Thứ 3, 5, 7 đi bộ nhẹ 20–30 phút hoặc giãn cơ (không XP, không tính là bỏ lỡ); chủ nhật nghỉ hẳn. Đau nhói hoặc chóng mặt thì dừng.',
    sessionMinutes: 45, sessionXp: 40, days: [
    { title: 'Buổi A — Ngực ưu tiên / Toàn thân', weekdays: [1], groups: ['CHEST', 'BACK', 'LEGS', 'CORE'], exerciseIds: ['machine-chest-press', 'incline-db-press', 'seated-row', 'leg-press', 'dead-bug'],
      overrides: { 'incline-db-press': { sets: 2, reps: 10 }, 'seated-row': { sets: 2, reps: 10 }, 'leg-press': { sets: 2, reps: 10 } } },
    { title: 'Buổi B — Chân, lưng, vai', weekdays: [3], groups: ['LEGS', 'BACK', 'SHOULDERS', 'CORE'], exerciseIds: ['goblet-squat', 'lat-pulldown', 'db-romanian-deadlift', 'machine-shoulder-press', 'plank'],
      overrides: { 'lat-pulldown': { sets: 2, reps: 10 }, plank: { sets: 2, reps: 20 } } },
    { title: 'Buổi C — Ngực, lưng, chân', weekdays: [5], groups: ['CHEST', 'BACK', 'LEGS', 'SHOULDERS'], exerciseIds: ['machine-chest-press', 'seated-row', 'seated-leg-curl', 'leg-extension', 'db-lateral-raise'],
      overrides: { 'seated-row': { sets: 2, reps: 10 } } }
  ] },
  { id: 'push-pull-legs', name: 'Đẩy / Kéo / Chân — 3 buổi', description: 'Thứ 2, 4, 6. Hợp người mới hoặc ít thời gian: mỗi nhóm cơ được tập một lần mỗi tuần.', days: [
    { title: 'Đẩy: Ngực + Vai + Tay sau', weekdays: [1], groups: ['CHEST', 'SHOULDERS', 'ARMS'], exerciseIds: ['bench-press', 'incline-db-press', 'overhead-press', 'lateral-raise', 'triceps-pushdown'] },
    { title: 'Kéo: Lưng + Vai sau + Tay trước', weekdays: [3], groups: ['BACK', 'SHOULDERS', 'ARMS'], exerciseIds: ['pull-up', 'barbell-row', 'seated-row', 'face-pull', 'barbell-curl'] },
    { title: 'Chân + Bụng', weekdays: [5], groups: ['LEGS', 'CORE'], exerciseIds: ['back-squat', 'romanian-deadlift', 'leg-press', 'calf-raise', 'plank'] }
  ] },
  { id: 'body-part-5', name: 'Chia nhóm cơ — 5 buổi', description: 'Thứ 2 đến thứ 6, mỗi ngày một nhóm cơ. Nghỉ thứ 7 và chủ nhật.', days: [
    { title: 'Ngực', weekdays: [1], groups: ['CHEST'], exerciseIds: ['bench-press', 'incline-db-press', 'cable-fly', 'chest-dip'] },
    { title: 'Lưng', weekdays: [2], groups: ['BACK'], exerciseIds: ['deadlift', 'pull-up', 'barbell-row', 'lat-pulldown'] },
    { title: 'Chân', weekdays: [3], groups: ['LEGS'], exerciseIds: ['back-squat', 'romanian-deadlift', 'leg-press', 'walking-lunge', 'calf-raise'] },
    { title: 'Vai', weekdays: [4], groups: ['SHOULDERS'], exerciseIds: ['overhead-press', 'lateral-raise', 'rear-delt-fly', 'face-pull'] },
    { title: 'Tay + Bụng', weekdays: [5], groups: ['ARMS', 'CORE'], exerciseIds: ['barbell-curl', 'skull-crusher', 'hammer-curl', 'overhead-triceps', 'hanging-leg-raise', 'plank'] }
  ] },
  { id: 'full-body-3', name: 'Toàn thân — 3 buổi', description: 'Thứ 2, 4, 6. Mỗi buổi đủ các nhóm cơ lớn, có ngày nghỉ xen giữa.', days: [
    { title: 'Toàn thân A', weekdays: [1], groups: ['LEGS', 'CHEST', 'BACK', 'SHOULDERS', 'CORE'], exerciseIds: ['back-squat', 'bench-press', 'barbell-row', 'overhead-press', 'plank'] },
    { title: 'Toàn thân B', weekdays: [3], groups: ['BACK', 'CHEST', 'LEGS', 'CORE'], exerciseIds: ['deadlift', 'incline-db-press', 'lat-pulldown', 'walking-lunge', 'hanging-leg-raise'] },
    { title: 'Toàn thân C', weekdays: [5], groups: ['LEGS', 'CHEST', 'BACK', 'ARMS'], exerciseIds: ['leg-press', 'push-up', 'seated-row', 'barbell-curl', 'triceps-pushdown'] }
  ] }
];

/** XP and time of one session; "Khó" by the display thresholds, like the owner's example quest. */
const DEFAULT_MINUTES = 60, DEFAULT_XP = 50;

/** One checklist line per exercise: the target is all repetitions of all sets, one tap adds one set. */
export function objectiveFor(e: Exercise): ObjectiveInput { return { title: e.name, target: e.sets * e.reps, unit: e.unit, step: e.reps }; }

export function planRequest(program: Program, startDate: string): ImportHabitPlanRequest {
  return { startDate, goals: [{
    title: `Gym — ${program.name}`, category: 'HEALTH', description: program.goalNote ?? program.description,
    habits: program.days.map(d => ({ title: d.title, targetMinutes: program.sessionMinutes ?? DEFAULT_MINUTES, xpReward: program.sessionXp ?? DEFAULT_XP, weekdays: d.weekdays, objectives: d.exerciseIds.map(id => objectiveFor(prescribed(d, id))) }))
  }] };
}

/** The checklist of a habit with one library exercise added at the end; null when the habit already has it (by name). */
export function withExercise(habit: { objectives: { title: string; target: number; unit: string; step: number }[] }, e: Exercise): ObjectiveInput[] | null {
  if (habit.objectives.some(o => o.title.trim().toLowerCase() === e.name.toLowerCase())) return null;
  return [...habit.objectives.map(o => ({ title: o.title, target: o.target, unit: o.unit, step: o.step })), objectiveFor(e)];
}
/** A habit is a gym session when at least one checklist line is a library exercise. */
export const isGymHabit = (habit: { status?: string; objectives: { title: string }[] }) => habit.status !== 'ARCHIVED' && habit.objectives.some(o => !!exerciseByName(o.title));
