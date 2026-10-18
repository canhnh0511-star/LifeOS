import { describe, expect, it } from 'vitest';
import { EXERCISES, exerciseById, exercisesFor, muscleLabel, objectiveFor, exerciseByName, viName, type MuscleGroup } from './exerciseLibrary';

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
