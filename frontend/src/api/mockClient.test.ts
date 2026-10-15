import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient, resetDemoData } from './mockClient';
import { todayInTimezone } from '../domain/rules';

const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => { store.set(key, val); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); }
  }
});
beforeEach(() => { store.clear(); resetDemoData(); });

describe('mock API contracts', () => {
  it('PUT/DELETE completion are idempotent and re-completing works', async () => {
    const date = todayInTimezone();
    const dashboard = await mockClient.getDashboard(date);
    const pending = dashboard.quests.find(q => q.status === 'PENDING');
    expect(pending).toBeTruthy();
    const { habitId, xpReward } = pending!;
    const initial = dashboard.progress.totalXp;
    const one = await mockClient.completeQuest(habitId, date);
    const duplicate = await mockClient.completeQuest(habitId, date);
    expect(one.xpAwarded).toBe(xpReward);
    expect(duplicate.xpAwarded).toBe(0);
    const reverted = await mockClient.undoQuest(habitId, date);
    const repeatedUndo = await mockClient.undoQuest(habitId, date);
    expect(reverted.xpAwarded).toBe(-xpReward);
    expect(repeatedUndo.xpAwarded).toBe(0);
    const completedAgain = await mockClient.completeQuest(habitId, date);
    expect(completedAgain.totalXp).toBe(initial + xpReward);
  });
  it('creates a goal and today-scheduled habit', async () => {
    const date = todayInTimezone();
    const goal = await mockClient.createGoal({ title: 'Learn AI', category: 'CAREER', description: 'Personal' });
    const habit = await mockClient.createHabit({ title: 'Study', goalId: goal.id, targetMinutes: 30, xpReward: 35, weekdays: [1,2,3,4,5,6,7], startDate: date });
    expect((await mockClient.getDashboard(date)).quests.some(q => q.habitId === habit.id)).toBe(true);
  });
  it('provides a seven-day analytics sequence', async () => {
    const a = await mockClient.getAnalytics('7d');
    expect(a.days).toHaveLength(7);
    expect(a.completedCount).toBeLessThanOrEqual(a.scheduledCount);
  });
  it('adds a previous period of the same length to analytics', async () => {
    const a = await mockClient.getAnalytics('7d');
    expect(a.previous).toBeTruthy();
    expect(a.previous!.completedCount).toBeLessThanOrEqual(a.previous!.scheduledCount);
    const m = await mockClient.getAnalytics('30d');
    expect(m.days).toHaveLength(30);
    expect(m.previous!.scheduledCount).toBeGreaterThanOrEqual(0);
  });
  it('previous period excludes the days of the current period', async () => {
    const date = todayInTimezone();
    const before = await mockClient.getAnalytics('7d');
    const pending = (await mockClient.getDashboard(date)).quests.find(q => q.status === 'PENDING');
    if (!pending) return;
    await mockClient.completeQuest(pending.habitId, date);
    const after = await mockClient.getAnalytics('7d');
    expect(after.completedCount).toBe(before.completedCount + 1);
    expect(after.previous).toEqual(before.previous);
  });
});
