import { describe, expect, it } from 'vitest';
import { EXERCISES, exerciseById, objectiveFor, planRequest, prescribed } from './exerciseLibrary';
import { infoFor } from './exerciseInfo';
import type { GoalDto, HabitDto } from '../api/types';
import { GOALS, PLACES, SESSION_OPTIONS, buildProgram, goalFromTitle, levelOf, replacementFor, restSecondsFor, type PlanChoice, type TrainPlace, type TrainingGoal } from './planBuilder';

const goals = Object.keys(GOALS) as TrainingGoal[], places = Object.keys(PLACES) as TrainPlace[];
const combos: PlanChoice[] = goals.flatMap(goal => places.flatMap(place => SESSION_OPTIONS.map(sessions => ({ goal, place, sessions }))));
const ALLOWED: Record<TrainPlace, string[]> = { HOME: ['HOME'], DUMBBELL: ['HOME', 'DUMBBELL'], GYM: ['HOME', 'DUMBBELL', 'GYM'] };

describe('plan builder: equipment levels', () => {
  it('knows the equipment level of every library exercise (so a new exercise cannot be offered to the wrong place)', () => {
    for (const e of EXERCISES) expect(['HOME', 'DUMBBELL', 'GYM'], e.id).toContain(levelOf(e.id));
  });
  it('offers the three goals and three places of the design, and 2 to 5 sessions', () => {
    expect(goals).toEqual(['MUSCLE', 'FAT_LOSS', 'STRENGTH']);
    expect(places).toEqual(['GYM', 'DUMBBELL', 'HOME']);
    expect(SESSION_OPTIONS).toEqual([2, 3, 4, 5]);
  });
});

describe.each(combos)('program for $goal / $place / $sessions sessions', choice => {
  const program = buildProgram(choice);
  const request = planRequest(program, '2026-10-19');
  const used = (d: (typeof program.days)[number]) => d.exerciseIds.map(id => prescribed(d, id));
  it('has exactly the requested number of sessions, each on its own weekday, leaving a rest day', () => {
    expect(program.days).toHaveLength(choice.sessions);
    const days = program.days.flatMap(d => d.weekdays);
    expect(new Set(days).size).toBe(days.length);
    expect(days.length).toBeLessThan(7);
    expect(new Set(program.days.map(d => d.title)).size).toBe(program.days.length);
  });
  it('only uses exercises that the place can do, with no repeat inside a session and a sensible length', () => {
    for (const d of program.days) {
      const ids = d.exerciseIds;
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThanOrEqual(4); expect(ids.length).toBeLessThanOrEqual(6);
      for (const id of ids) expect(ALLOWED[choice.place], `${id} needs ${levelOf(id)}`).toContain(levelOf(id));
      const groups = new Set(ids.map(id => exerciseById(id).group));
      for (const g of groups) expect(d.groups).toContain(g);
    }
  });
  it('trains chest, back, legs and shoulders at least once a week', () => {
    const week = new Set(program.days.flatMap(d => d.exerciseIds.map(id => exerciseById(id).group)));
    for (const g of ['CHEST', 'BACK', 'LEGS', 'SHOULDERS'] as const) expect(week.has(g), g).toBe(true);
  });
  it('turns into a valid import request whose checklist taps add whole sets', () => {
    const goal = request.goals[0];
    expect(goal.title.startsWith('Gym — ')).toBe(true); expect(goal.title.length).toBeLessThanOrEqual(150); expect(goal.description.length).toBeLessThanOrEqual(600);
    for (const h of goal.habits) {
      expect(h.targetMinutes).toBeGreaterThanOrEqual(20); expect(h.targetMinutes).toBeLessThanOrEqual(90);
      expect(h.xpReward).toBeGreaterThanOrEqual(0); expect(h.xpReward).toBeLessThanOrEqual(100);
      for (const o of h.objectives!) expect(o.target % o.step!).toBe(0);
    }
    expect(goalFromTitle(goal.title)).toBe(choice.goal);
  });
  it('prescribes for the goal', () => {
    for (const d of program.days) for (const e of used(d)) {
      const kind = infoFor(e).kind;
      if (e.unit === 'giây') { expect(e.reps).toBeGreaterThanOrEqual(20); expect(e.reps).toBeLessThanOrEqual(60); continue; }
      if (choice.goal === 'MUSCLE') { expect(e.reps).toBeGreaterThanOrEqual(8); expect(e.reps).toBeLessThanOrEqual(12); }
      if (choice.goal === 'FAT_LOSS') { expect(e.reps).toBeGreaterThanOrEqual(12); expect(e.reps).toBeLessThanOrEqual(15); }
      if (choice.goal === 'STRENGTH' && kind === 'COMPOUND') { expect(e.reps).toBeGreaterThanOrEqual(5); expect(e.reps).toBeLessThanOrEqual(8); }
      expect(e.sets).toBeGreaterThanOrEqual(2); expect(e.sets).toBeLessThanOrEqual(5);
    }
    if (choice.goal === 'FAT_LOSS') for (const d of program.days) expect(new Set(d.exerciseIds.map(id => exerciseById(id).group)).size, d.title).toBeGreaterThanOrEqual(4);   // full body every session
    if (choice.goal === 'STRENGTH') for (const d of program.days) expect(d.exerciseIds.length, d.title).toBeLessThanOrEqual(5);                                            // fewer lifts
  });
});

describe('what the goal changes', () => {
  const bench = exerciseById('machine-chest-press');
  it('rests longest for strength and shortest for fat loss, and the plan says which goal it was built for', () => {
    expect(restSecondsFor('STRENGTH', bench)).toBeGreaterThanOrEqual(120); expect(restSecondsFor('STRENGTH', bench)).toBeLessThanOrEqual(180);
    expect(restSecondsFor('MUSCLE', bench)).toBeGreaterThanOrEqual(60); expect(restSecondsFor('MUSCLE', bench)).toBeLessThanOrEqual(90);
    expect(restSecondsFor('FAT_LOSS', bench)).toBeGreaterThanOrEqual(30); expect(restSecondsFor('FAT_LOSS', bench)).toBeLessThanOrEqual(45);
    expect(goalFromTitle('Gym — Giảm mỡ · Tại nhà · 3 buổi/tuần')).toBe('FAT_LOSS');
    expect(goalFromTitle('Thói quen đọc sách')).toBeUndefined();
    expect(goalFromTitle(undefined)).toBeUndefined();
  });
  it('gives different plans for different goals at the same place and frequency', () => {
    const sig = (g: TrainingGoal) => JSON.stringify(buildProgram({ goal: g, place: 'GYM', sessions: 3 }).days.map(d => d.exerciseIds.map(id => [id, prescribed(d, id).sets, prescribed(d, id).reps])));
    expect(new Set([sig('MUSCLE'), sig('FAT_LOSS'), sig('STRENGTH')]).size).toBe(3);
  });
  it('a gym muscle plan with 3 sessions is push / pull / legs; home plans never need gear', () => {
    expect(buildProgram({ goal: 'MUSCLE', place: 'GYM', sessions: 3 }).days.map(d => d.title.split('— ')[1])).toEqual(['Đẩy', 'Kéo', 'Chân']);
    const home = buildProgram({ goal: 'MUSCLE', place: 'HOME', sessions: 4 });
    expect(home.days.flatMap(d => d.exerciseIds).every(id => levelOf(id) === 'HOME')).toBe(true);
  });
  it('labels a plan with goal, place and frequency, and builds the objective lines the set log expects', () => {
    const p = buildProgram({ goal: 'MUSCLE', place: 'GYM', sessions: 3 });
    expect(p.name).toBe('Tăng cơ · Phòng gym đủ máy · 3 buổi/tuần');
    const d = p.days[0], e = prescribed(d, d.exerciseIds[0]);
    expect(objectiveFor(e)).toEqual({ title: e.name, target: e.sets * e.reps, unit: e.unit, step: e.reps });
  });
});

describe('what a new plan replaces', () => {
  const goal = (id: string, status: GoalDto['status'] = 'ACTIVE'): GoalDto => ({ id, title: id, category: 'HEALTH', description: '', status, createdAt: '2026-10-01T00:00:00Z' });
  const habit = (id: string, goalId: string, exercise?: string, status: HabitDto['status'] = 'ACTIVE'): HabitDto => ({ id, goalId, title: id, targetMinutes: 30, xpReward: 20, weekdays: [1], startDate: '2026-10-01', endDate: null, status, objectives: exercise ? [{ id: 'o', title: exercise, target: 30, unit: 'rep', step: 10 }] : [] });
  it('is nothing when there is no active gym session', () => {
    expect(replacementFor([goal('g1')], [habit('h1', 'g1'), habit('h2', 'g1', 'Plank', 'ARCHIVED')])).toEqual({ goalIds: [], habitIds: [] });
  });
  it('archives the gym sessions and the goal that only holds them', () => {
    expect(replacementFor([goal('g1')], [habit('a', 'g1', 'Barbell Bench Press'), habit('b', 'g1', 'Seated Cable Row')])).toEqual({ goalIds: ['g1'], habitIds: ['a', 'b'] });
  });
  it('keeps a goal that also holds other habits, and goals that are not active', () => {
    expect(replacementFor([goal('g1'), goal('g2', 'PAUSED')], [habit('a', 'g1', 'Leg Press'), habit('read', 'g1'), habit('c', 'g2', 'Leg Press')])).toEqual({ goalIds: [], habitIds: ['a', 'c'] });
  });
});
