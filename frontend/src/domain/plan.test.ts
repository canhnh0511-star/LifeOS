import { describe, expect, it } from 'vitest';
import type { GoalDto, HabitDto } from '../api/types';
import { exerciseByName } from './exerciseLibrary';
import { isStandardPlanGoal, replacementFor, restSecondsFor } from './plan';
import { STANDARD_PLAN_TITLE } from './standardPlan';

const goal = (id: string, title: string, status = 'ACTIVE'): GoalDto => ({ id, title, category: 'HEALTH', description: '', status, createdAt: '2026-10-01T00:00:00Z' } as GoalDto);
const habit = (id: string, goalId: string, line: string, status = 'ACTIVE'): HabitDto => ({ id, goalId, title: id, targetMinutes: 30, xpReward: 20, weekdays: [1], startDate: '2026-10-01', endDate: null, status, objectives: [{ id: id + 'o', title: line, target: 10, unit: 'rep', step: 10 }] } as HabitDto);

describe('rest times follow the standard plan', () => {
  it('suggests 90 s after a compound lift and 60 s after the rest, only for the standard plan', () => {
    expect(restSecondsFor(STANDARD_PLAN_TITLE, exerciseByName('Leg Press')!)).toBe(90);
    expect(restSecondsFor(STANDARD_PLAN_TITLE, exerciseByName('Dumbbell Lateral Raise')!)).toBe(60);
  });
  it('keeps the library suggestion for any other goal, including a renamed plan', () => {
    const e = exerciseByName('Machine Chest Press')!;
    expect(restSecondsFor('Kế hoạch của tôi', e)).toBe(e.restSeconds);
    expect(restSecondsFor(undefined, e)).toBe(e.restSeconds);
  });
  it('recognises the plan by its title, ignoring case and spaces', () => {
    expect(isStandardPlanGoal(`  ${STANDARD_PLAN_TITLE.toUpperCase()} `)).toBe(true);
    expect(isStandardPlanGoal('Gym — Tăng cơ · (3 buổi)')).toBe(false);
  });
});

describe('replacementFor', () => {
  it('replaces active gym sessions and the goals that hold only them, never the standard plan', () => {
    const goals = [goal('old', 'Gym cũ'), goal('std', STANDARD_PLAN_TITLE), goal('mix', 'Hỗn hợp')];
    const habits = [habit('h1', 'old', 'Leg Press'), habit('h2', 'std', 'Leg Press'), habit('h3', 'mix', 'Leg Press'), habit('h4', 'mix', 'Scales')];
    expect(replacementFor(goals, habits)).toEqual({ goalIds: ['old'], habitIds: ['h1', 'h3'] });
  });
  it('is empty when there are no gym sessions', () => {
    expect(replacementFor([goal('g', 'Piano')], [habit('p', 'g', 'Scales')])).toEqual({ goalIds: [], habitIds: [] });
  });
});
