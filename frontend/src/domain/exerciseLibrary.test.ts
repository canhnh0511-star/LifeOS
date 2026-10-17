import { describe, expect, it } from 'vitest';
import { EXERCISES, PROGRAMS, exerciseById, exercisesFor, muscleLabel, objectiveFor, exerciseByName, viName, planRequest, prescribed, type MuscleGroup } from './exerciseLibrary';
import { goalFromTitle } from './planBuilder';

describe('exercise library (B-32)', () => {
  it('has unique ids and names, and several exercises for every muscle group', () => {
    expect(new Set(EXERCISES.map(e => e.id)).size).toBe(EXERCISES.length);
    expect(new Set(EXERCISES.map(e => e.name.toLowerCase())).size).toBe(EXERCISES.length);
    for (const g of Object.keys(muscleLabel) as MuscleGroup[]) expect(exercisesFor(g).length).toBeGreaterThanOrEqual(3);
  });
  it('turns an exercise into one checklist line where a tap adds one set', () => {
    expect(objectiveFor(exerciseById('bench-press'))).toEqual({ title: 'Barbell Bench Press', target: 32, unit: 'rep', step: 8 });
    expect(objectiveFor(exerciseById('plank'))).toEqual({ title: 'Plank', target: 135, unit: 'giây', step: 45 });
  });
});

describe.each(PROGRAMS)('program $name', program => {
  const request = planRequest(program, '2026-10-19');
  const habits = request.goals[0].habits;
  it('only uses known exercises and trains the muscle groups it says it does', () => {
    for (const d of program.days) {
      expect(d.exerciseIds.length).toBeGreaterThan(0);
      const groups = new Set(d.exerciseIds.map(id => exerciseById(id).group));
      for (const g of groups) expect(d.groups).toContain(g);
    }
  });
  it('never schedules two sessions on the same weekday, and leaves a rest day', () => {
    const days = program.days.flatMap(d => d.weekdays);
    expect(new Set(days).size).toBe(days.length);
    expect(days.length).toBeLessThan(7);
  });
  it('builds a request that fits the import contract', () => {
    expect(request.goals).toHaveLength(1);
    expect(request.goals[0].category).toBe('HEALTH');
    expect(request.goals[0].title.length).toBeLessThanOrEqual(150);
    expect(request.goals[0].description.length).toBeLessThanOrEqual(600);
    expect(habits.length).toBeLessThanOrEqual(50);
    for (const h of habits) {
      expect(h.title.length).toBeGreaterThan(0); expect(h.title.length).toBeLessThanOrEqual(150);
      expect(h.targetMinutes).toBeGreaterThanOrEqual(1); expect(h.targetMinutes).toBeLessThanOrEqual(480);
      expect(h.xpReward).toBeGreaterThanOrEqual(0); expect(h.xpReward).toBeLessThanOrEqual(100);
      expect(request.goals[0].description.length).toBeLessThanOrEqual(600);
      expect(new Set(h.weekdays).size).toBe(h.weekdays.length);
      expect(h.objectives!.length).toBeLessThanOrEqual(20);
      for (const o of h.objectives!) { expect(o.title.length).toBeLessThanOrEqual(100); expect(o.target).toBeLessThanOrEqual(10000); expect(o.target % o.step!).toBe(0); }
    }
  });
});

describe('week 1 return program (docs/LifeOS_Gym_Week1_2026-10-19.md)', () => {
  const week1 = PROGRAMS.find(p => p.id === 'week1-return')!;
  const request = planRequest(week1, '2026-10-19');
  it('has the three original sessions (Mon, Wed, Fri) plus the Saturday and Sunday sessions the owner asked for, each worth 40 XP and 45 minutes, and no habit for Tue/Thu rest days', () => {
    expect(request.goals[0].habits.map(h => h.weekdays)).toEqual([[1], [3], [5], [6], [7]]);
    for (const h of request.goals[0].habits) { expect(h.xpReward).toBe(40); expect(h.targetMinutes).toBe(45); expect(h.objectives).toHaveLength(5); }
    expect(week1.days.flatMap(d => d.weekdays).some(w => w === 2 || w === 4)).toBe(false);
    expect(request.goals[0].description).toContain('không XP');
  });
  it('prescribes two sets per exercise with the planned order', () => {
    const a = week1.days[0];
    expect(a.exerciseIds.map(id => exerciseById(id).name)).toEqual(['Machine Chest Press', 'Incline Dumbbell Press', 'Seated Cable Row', 'Leg Press', 'Dead Bug']);
    expect(a.exerciseIds.every(id => prescribed(a, id).sets === 2)).toBe(true);
    expect(objectiveFor(prescribed(a, 'dead-bug'))).toEqual({ title: 'Dead Bug', target: 16, unit: 'rep', step: 8 });
    expect(objectiveFor(prescribed(week1.days[1], 'plank'))).toEqual({ title: 'Plank', target: 40, unit: 'giây', step: 20 });
  });
});

describe('rest times from the week-1 plan', () => {
  it('finds an exercise by its checklist name and knows its rest', () => {
    expect(exerciseByName('seated leg curl')?.restSeconds).toBe(75);
    expect(exerciseByName(' Dead Bug ')?.restSeconds).toBe(60);
    expect(exerciseByName('Machine Chest Press')?.restSeconds).toBe(90);
    expect(exerciseByName('Bài tự đặt tên')).toBeUndefined();
    expect(exerciseByName('Barbell Curl')?.restSeconds).toBeUndefined();
  });
});

describe('Vietnamese exercise names', () => {
  it('gives every exercise a unique Vietnamese name that differs from the English storage key', () => {
    for (const e of EXERCISES) { expect(e.nameVi, e.id).toBeTruthy(); expect(e.nameVi).not.toBe(e.name); }
    expect(new Set(EXERCISES.map(e => e.nameVi)).size).toBe(EXERCISES.length);
  });
  it('shows Vietnamese for a stored name, keeps unknown names as they are, and does not change the storage key', () => {
    expect(viName('Goblet Squat')).toBe('Squat ôm tạ trước ngực (Goblet)');
    expect(viName('goblet squat ')).toBe('Squat ôm tạ trước ngực (Goblet)');
    expect(viName('Uống nước')).toBe('Uống nước');
    expect(objectiveFor(exerciseById('goblet-squat')).title).toBe('Goblet Squat');
  });
});

describe('program "Tăng cơ · giảm mỡ toàn thân"', () => {
  const p = PROGRAMS.find(x => x.id === 'recomp-3')!;
  it('has three full-body sessions of 6 exercises, 3 sets each, on Monday, Wednesday and Friday', () => {
    expect(p.days.map(d => d.weekdays[0])).toEqual([1, 3, 5]);
    for (const d of p.days) { expect(d.exerciseIds).toHaveLength(6); for (const id of d.exerciseIds) expect(prescribed(d, id).sets).toBe(3); }
  });
  it('uses the twelve exercises of the plan, all in the library', () => {
    const ids = new Set(p.days.flatMap(d => d.exerciseIds));
    for (const id of ['leg-press', 'machine-chest-press', 'lat-pulldown', 'db-shoulder-press', 'glute-bridge', 'plank', 'goblet-squat', 'push-up', 'db-row', 'db-romanian-deadlift', 'db-lateral-raise', 'bird-dog']) expect(ids.has(id)).toBe(true);
  });
  it('is read as a muscle-gain plan so rest between sets is 60-90 seconds', () => {
    expect(goalFromTitle(planRequest(p, '2026-10-19').goals[0].title)).toBe('MUSCLE');
  });
});
