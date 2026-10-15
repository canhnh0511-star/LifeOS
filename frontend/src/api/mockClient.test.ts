import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportDemoData, mockClient, resetDemoData } from './mockClient';
import { ApiError } from './errors';
import type { Weekday } from './types';
import { levelProgress, moveDate, todayInTimezone } from '../domain/rules';
import { ALL_CATEGORIES } from '../domain/insights';

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
afterEach(() => { vi.useRealTimers(); });

/** 2026-10-14 is a Wednesday; 05:00Z is noon in Asia/Ho_Chi_Minh. */
const D0 = '2026-10-14';
function freezeAt(date: string) { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(`${date}T05:00:00Z`)); }
async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  try { await promise; } catch (e) { return e as ApiError; }
  throw new Error('expected promise to reject');
}
const ledger = () => (JSON.parse(exportDemoData()) as { xpTransactions: { habitId?: string; achievementCode?: string; category: string; date: string; type: string; cycle: number; amount: number }[] }).xpTransactions;

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

describe('XP ledger', () => {
  it('keeps every event, uses a new cycle for each completion and reverses the snapshotted amount', async () => {
    freezeAt(D0);
    const habitId = 'habit-piano'; // daily, 35 XP, still pending on the seed's last day
    expect((await mockClient.getDashboard(D0)).quests.find(q => q.habitId === habitId)?.status).toBe('PENDING');
    const sizeBefore = ledger().length;
    await mockClient.completeQuest(habitId, D0);
    await mockClient.undoQuest(habitId, D0);
    await mockClient.completeQuest(habitId, D0);
    const events = ledger().slice(sizeBefore);
    expect(events.map(e => [e.type, e.cycle, e.amount])).toEqual([
      ['QUEST_COMPLETE', 1, 35], ['QUEST_REVERT', 1, -35], ['QUEST_COMPLETE', 2, 35]
    ]);
    const keys = events.map(e => `${e.habitId}|${e.date}|${e.cycle}|${e.type}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('lets a zero-reward habit change state without writing a ledger event', async () => {
    freezeAt(D0);
    const goal = await mockClient.createGoal({ title: 'Free', category: 'MINDFULNESS', description: '' });
    const habit = await mockClient.createHabit({ title: 'Breathe', goalId: goal.id, targetMinutes: 5, xpReward: 0, weekdays: [1,2,3,4,5,6,7], startDate: D0 });
    const size = ledger().length;
    const done = await mockClient.completeQuest(habit.id, D0);
    expect(done.status).toBe('COMPLETED');
    expect(done.xpAwarded).toBe(done.effects!.reduce((a, e) => a + e.xpDelta, 0)); // only side effects (achievements) can pay
    expect((await mockClient.completeQuest(habit.id, D0)).status).toBe('COMPLETED');
    expect((await mockClient.undoQuest(habit.id, D0)).status).toBe('PENDING');
    expect(ledger().slice(size).filter(e => e.type.startsWith('QUEST_'))).toEqual([]);
  });
  it('does not write anything on GET', async () => {
    freezeAt(D0);
    const before = exportDemoData();
    await mockClient.getDashboard(D0); await mockClient.getQuests(D0); await mockClient.getAnalytics('30d'); await mockClient.getCurrentJourney();
    expect(exportDemoData()).toBe(before);
  });
});

describe('area stats', () => {
  it('reports one entry per category and totalXp equals the sum of area XP', async () => {
    freezeAt(D0);
    const { progress } = await mockClient.getDashboard(D0);
    expect(progress.areas.map(a => a.category)).toEqual(ALL_CATEGORIES);
    expect(progress.areas.reduce((a, x) => a + x.xp, 0)).toBe(progress.totalXp);
    for (const a of progress.areas) expect(a.level).toBe(levelProgress(a.xp).level);
  });
  it('credits a quest to its own area and takes it back on undo', async () => {
    freezeAt(D0);
    const area = async () => (await mockClient.getDashboard(D0)).progress.areas.find(a => a.category === 'CREATIVITY')!.xp;
    const before = await area();
    await mockClient.completeQuest('habit-piano', D0);
    expect(await area()).toBe(before + 35);
    await mockClient.undoQuest('habit-piano', D0);
    expect(await area()).toBe(before);
  });
});

describe('bosses', () => {
  const chaptersOf = async () => (await mockClient.getCurrentJourney())!.chapters!;
  const bossOf = async (code: string) => (await chaptersOf()).map(c => c.boss).find(b => b.code === code)!;
  const area = async (category: string) => (await mockClient.getProgress()).areas.find(a => a.category === category)!.xp;

  it('exposes four chapters with their boss, locked or available by area level', async () => {
    freezeAt(D0);
    const chapters = await chaptersOf();
    expect(chapters.map(c => [c.startDate, c.endDate])).toEqual([
      [moveDate(D0, -20), moveDate(D0, -14)], [moveDate(D0, -13), D0], [moveDate(D0, 1), moveDate(D0, 23)], [moveDate(D0, 24), moveDate(D0, 45)]
    ]);
    expect(chapters.map(c => c.boss.bossDate)).toEqual(chapters.map(c => c.endDate));
    expect(chapters.map(c => c.boss.status)).toEqual(['AVAILABLE', 'AVAILABLE', 'LOCKED', 'LOCKED']);
    expect(chapters[2].boss.currentAreaLevel).toBeLessThan(chapters[2].boss.requiredLevel);
  });
  it('defeating a boss pays XP into its area, is idempotent and undo takes it back', async () => {
    freezeAt(D0);
    const boss = await bossOf('SLIME_OF_INERTIA');
    const before = await area(boss.category);
    const sizeBefore = ledger().length;
    const win = await mockClient.defeatBoss(boss.id);
    const bonus = win.effects.reduce((a, e) => a + e.xpDelta, 0); // the boss may also complete the BALANCED achievement
    expect(win).toMatchObject({ bossId: boss.id, status: 'DEFEATED', xpAwarded: boss.xpReward + bonus });
    expect(await area(boss.category)).toBeGreaterThanOrEqual(before + boss.xpReward);
    expect((await mockClient.defeatBoss(boss.id)).xpAwarded).toBe(0);
    const defeated = await bossOf('SLIME_OF_INERTIA');
    expect([defeated.status, defeated.defeatedDate]).toEqual(['DEFEATED', D0]);
    expect((await mockClient.undoBoss(boss.id)).xpAwarded).toBe(-(boss.xpReward + bonus));
    expect((await mockClient.undoBoss(boss.id)).xpAwarded).toBe(0);
    expect(await area(boss.category)).toBe(before);
    await mockClient.defeatBoss(boss.id);
    expect(ledger().slice(sizeBefore).filter(e => e.type.startsWith('BOSS_')).map(e => [e.type, e.cycle, e.amount])).toEqual([
      ['BOSS_COMPLETE', 1, boss.xpReward], ['BOSS_REVERT', 1, -boss.xpReward], ['BOSS_COMPLETE', 2, boss.xpReward]
    ]);
  });
  it('rejects a locked boss with BOSS_LOCKED and an unknown boss with NOT_FOUND', async () => {
    freezeAt(D0);
    const locked = await bossOf('TROLL_OF_BURNOUT');
    expect(await rejection(mockClient.defeatBoss(locked.id))).toMatchObject({ status: 409, code: 'BOSS_LOCKED' });
    expect(await rejection(mockClient.defeatBoss('nope'))).toMatchObject({ status: 404, code: 'NOT_FOUND' });
    expect(await rejection(mockClient.undoBoss('nope'))).toMatchObject({ status: 404 });
  });
  it('refuses to undo a boss defeated more than 7 days ago', async () => {
    freezeAt(D0);
    const boss = await bossOf('SLIME_OF_INERTIA');
    await mockClient.defeatBoss(boss.id);
    freezeAt(moveDate(D0, 8));
    expect(await rejection(mockClient.undoBoss(boss.id))).toMatchObject({ status: 422, code: 'QUEST_TOO_OLD' });
  });
  it('counts a boss as scheduled on bossDate and completed on the defeat date, without touching the streak', async () => {
    freezeAt(D0);
    const dayStats = async () => (await mockClient.getAnalytics('7d')).days.find(d => d.date === D0)!;
    const dash = await mockClient.getDashboard(D0);
    const before = await dayStats();
    // Gargoyle's bossDate is D0, so it is one extra scheduled item today even before it is defeated.
    expect(before.scheduled).toBe(dash.scheduledCount + 1);
    const boss = await bossOf('GARGOYLE_OF_DISTRACTION');
    await mockClient.defeatBoss(boss.id);
    const after = await dayStats();
    expect([after.scheduled, after.completed]).toEqual([before.scheduled, before.completed + 1]);
    expect((await mockClient.getDashboard(D0)).progress.currentStreak).toBe(dash.progress.currentStreak);
  });
});

describe('achievements', () => {
  const statuses = async () => Object.fromEntries((await mockClient.getAchievements()).map(a => [a.code, a.status]));
  const achievementEvents = (since: number) => ledger().slice(since).filter(e => e.type.startsWith('ACHIEVEMENT_')).map(e => [e.achievementCode, e.type, e.cycle, e.amount]);

  it('starts with the achievements the seed history already earned, each backed by a ledger event', async () => {
    freezeAt(D0);
    expect(await statuses()).toEqual({ STREAK_7: 'EARNED', BALANCED: 'LOCKED', COMEBACK: 'EARNED' });
    const grants = achievementEvents(0);
    expect(grants.map(g => g[0]).sort()).toEqual(['COMEBACK', 'STREAK_7']);
    const { progress } = await mockClient.getDashboard(D0);
    expect(progress.areas.reduce((a, x) => a + x.xp, 0)).toBe(progress.totalXp);
  });
  it('revokes an achievement when an undo breaks it inside the window and grants it again on redo (new cycle)', async () => {
    freezeAt(D0);
    const size = ledger().length;
    const undo = await mockClient.undoQuest('habit-code', D0); // streak 7 -> 6
    expect(undo.effects).toEqual([{ type: 'ACHIEVEMENT_REVOKED', code: 'STREAK_7', xpDelta: -20 }]);
    expect(undo.xpAwarded).toBe(-50 - 20);
    expect((await statuses()).STREAK_7).toBe('LOCKED');
    const redo = await mockClient.completeQuest('habit-code', D0);
    expect(redo.effects).toEqual([{ type: 'ACHIEVEMENT_GRANTED', code: 'STREAK_7', xpDelta: 20 }]);
    expect(redo.xpAwarded).toBe(50 + 20);
    expect(achievementEvents(size)).toEqual([['STREAK_7', 'ACHIEVEMENT_REVOKE', 1, -20], ['STREAK_7', 'ACHIEVEMENT_GRANT', 2, 20]]);
  });
  it('never grants twice while the condition keeps holding, and an idempotent retry reports no effects', async () => {
    freezeAt(D0);
    const size = ledger().length;
    const again = await mockClient.completeQuest('habit-code', D0); // already completed in the seed
    expect(again).toMatchObject({ xpAwarded: 0, effects: [] });
    await mockClient.completeQuest('habit-piano', D0);
    expect(achievementEvents(size)).toEqual([]);
  });
  it('spreads BALANCED evenly over the five areas and takes it all back on undo', async () => {
    freezeAt(D0);
    const boss = (await mockClient.getCurrentJourney())!.chapters.map(c => c.boss).find(b => b.code === 'SLIME_OF_INERTIA')!;
    const size = ledger().length;
    const win = await mockClient.defeatBoss(boss.id);
    expect(win.effects).toEqual([{ type: 'ACHIEVEMENT_GRANTED', code: 'BALANCED', xpDelta: 30 }]);
    const grants = ledger().slice(size).filter(e => e.achievementCode === 'BALANCED');
    expect(grants.map(g => [g.category, g.amount])).toEqual(ALL_CATEGORIES.map(c => [c, 6]));
    const undo = await mockClient.undoBoss(boss.id);
    expect(undo.effects).toEqual([{ type: 'ACHIEVEMENT_REVOKED', code: 'BALANCED', xpDelta: -30 }]);
    expect((await statuses()).BALANCED).toBe('LOCKED');
    const { progress } = await mockClient.getDashboard(D0);
    expect(progress.areas.reduce((a, x) => a + x.xp, 0)).toBe(progress.totalXp);
  });
});

describe('quest errors', () => {
  it('rejects the future with QUEST_IN_FUTURE (422)', async () => {
    freezeAt(D0);
    const e = await rejection(mockClient.completeQuest('habit-piano', moveDate(D0, 1)));
    expect(e).toBeInstanceOf(ApiError); expect([e.status, e.code]).toEqual([422, 'QUEST_IN_FUTURE']);
  });
  it('allows 7 days back and rejects 8 with QUEST_TOO_OLD (422)', async () => {
    freezeAt(D0);
    await expect(mockClient.undoQuest('habit-reading', moveDate(D0, -7))).resolves.toBeTruthy();
    const e = await rejection(mockClient.undoQuest('habit-reading', moveDate(D0, -8)));
    expect([e.status, e.code]).toEqual([422, 'QUEST_TOO_OLD']);
  });
  it('rejects unscheduled weekdays with QUEST_OUTSIDE_SCHEDULE (422)', async () => {
    freezeAt(D0); // Wednesday; habit-workout runs Tue/Thu/Sat
    const e = await rejection(mockClient.completeQuest('habit-workout', D0));
    expect([e.status, e.code]).toEqual([422, 'QUEST_OUTSIDE_SCHEDULE']);
  });
  it('rejects unknown habits with NOT_FOUND (404) and malformed dates with VALIDATION_FAILED', async () => {
    freezeAt(D0);
    const missing = await rejection(mockClient.completeQuest('nope', D0));
    expect([missing.status, missing.code]).toEqual([404, 'NOT_FOUND']);
    const bad = await rejection(mockClient.completeQuest('habit-piano', '14/10/2026'));
    expect([bad.status, bad.code]).toEqual([422, 'VALIDATION_FAILED']);
  });
});

describe('history is not rewritten by pause/resume', () => {
  it('a pause takes effect from the next local day and leaves past analytics untouched', async () => {
    freezeAt(D0);
    const before = await mockClient.getAnalytics('7d');
    const dashboardBefore = await mockClient.getDashboard(D0);
    await mockClient.updateHabit('habit-piano', { status: 'PAUSED' });
    const same = await mockClient.getAnalytics('7d');
    expect(same.days).toEqual(before.days);
    expect(same.categories).toEqual(before.categories);
    const dashboardSame = await mockClient.getDashboard(D0);
    expect(dashboardSame.quests.map(q => q.habitId)).toEqual(dashboardBefore.quests.map(q => q.habitId));
    expect(dashboardSame.journey).toEqual(dashboardBefore.journey);

    freezeAt(moveDate(D0, 1));
    const tomorrow = await mockClient.getDashboard(moveDate(D0, 1));
    expect(tomorrow.quests.some(q => q.habitId === 'habit-piano')).toBe(false);
    const later = await mockClient.getAnalytics('7d');
    const d0 = (a: typeof later) => a.days.find(d => d.date === D0);
    expect(d0(later)).toEqual(d0(before));
    expect((await mockClient.getDashboard(D0)).quests.some(q => q.habitId === 'habit-piano')).toBe(true);
  });
  it('resume also takes effect from the next day', async () => {
    freezeAt(D0);
    await mockClient.updateHabit('habit-piano', { status: 'PAUSED' });
    freezeAt(moveDate(D0, 1));
    await mockClient.updateHabit('habit-piano', { status: 'ACTIVE' });
    expect((await mockClient.getDashboard(moveDate(D0, 1))).quests.some(q => q.habitId === 'habit-piano')).toBe(false);
    freezeAt(moveDate(D0, 2));
    expect((await mockClient.getDashboard(moveDate(D0, 2))).quests.some(q => q.habitId === 'habit-piano')).toBe(true);
  });
  it('a paused day cannot be completed (QUEST_NOT_ACTIVE, 409) but an earlier day still can', async () => {
    freezeAt(D0);
    await mockClient.updateHabit('habit-piano', { status: 'PAUSED' });
    freezeAt(moveDate(D0, 1));
    const e = await rejection(mockClient.completeQuest('habit-piano', moveDate(D0, 1)));
    expect([e.status, e.code]).toEqual([409, 'QUEST_NOT_ACTIVE']);
    await expect(mockClient.undoQuest('habit-piano', D0)).resolves.toBeTruthy();
  });
  it('a paused goal blocks its habits the same way and earned XP matches visible quests', async () => {
    freezeAt(D0);
    await mockClient.updateGoal('goal-knowledge', { status: 'PAUSED' });
    freezeAt(moveDate(D0, 1));
    const e = await rejection(mockClient.completeQuest('habit-reading', moveDate(D0, 1)));
    expect(e.code).toBe('QUEST_NOT_ACTIVE');
    const dash = await mockClient.getDashboard(moveDate(D0, 1));
    const shownXp = dash.quests.filter(q => q.status === 'COMPLETED').reduce((a, q) => a + q.xpReward, 0);
    expect(dash.earnedXpToday).toBe(shownXp);
  });
  it('a paused habit does not break its longest streak and does not count as current', async () => {
    freezeAt(D0);
    const before = (await mockClient.getProgress()).longestStreak;
    await mockClient.updateHabit('habit-code', { status: 'PAUSED' });
    freezeAt(moveDate(D0, 3));
    expect((await mockClient.getProgress()).longestStreak).toBeGreaterThanOrEqual(before);
  });
});

describe('input validation', () => {
  it('rejects invalid goals with field messages', async () => {
    const blank = await rejection(mockClient.createGoal({ title: '   ', category: 'CAREER', description: '' }));
    expect([blank.status, blank.code]).toEqual([422, 'VALIDATION_FAILED']); expect(blank.fields).toHaveProperty('title');
    const long = await rejection(mockClient.createGoal({ title: 'x'.repeat(151), category: 'CAREER', description: 'y'.repeat(601) }));
    expect(Object.keys(long.fields ?? {}).sort()).toEqual(['description', 'title']);
    const cat = await rejection(mockClient.createGoal({ title: 'ok', category: 'MAGIC' as never, description: '' }));
    expect(cat.fields).toHaveProperty('category');
  });
  it('rejects invalid habits', async () => {
    freezeAt(D0);
    const valid = { title: 'h', goalId: 'goal-career', targetMinutes: 30, xpReward: 35, weekdays: [1, 2] as Weekday[], startDate: D0 };
    for (const [field, patch] of [
      ['targetMinutes', { targetMinutes: 481 }], ['targetMinutes', { targetMinutes: 1.5 }],
      ['xpReward', { xpReward: 101 }], ['xpReward', { xpReward: -1 }], ['xpReward', { xpReward: 10.5 }],
      ['weekdays', { weekdays: [] }], ['weekdays', { weekdays: [9] }],
      ['startDate', { startDate: 'nope' }], ['startDate', { startDate: moveDate(D0, -1) }],
      ['goalId', { goalId: 'missing' }], ['title', { title: ' ' }]
    ] as const) {
      const e = await rejection(mockClient.createHabit({ ...valid, ...patch } as never));
      expect([field, e.code, Object.keys(e.fields ?? {}).includes(field)]).toEqual([field, 'VALIDATION_FAILED', true]);
    }
    const paused = await mockClient.createGoal({ title: 'p', category: 'HEALTH', description: '' });
    await mockClient.updateGoal(paused.id, { status: 'PAUSED' });
    const e = await rejection(mockClient.createHabit({ ...valid, goalId: paused.id }));
    expect(e.fields).toHaveProperty('goalId');
  });
  it('only patches allowed fields and never changes ids', async () => {
    const empty = await rejection(mockClient.updateGoal('goal-career', {}));
    expect(empty.code).toBe('VALIDATION_FAILED');
    const sneaky = await rejection(mockClient.updateGoal('goal-career', { id: 'x' } as never));
    expect(sneaky.code).toBe('VALIDATION_FAILED');
    const blank = await rejection(mockClient.updateGoal('goal-career', { title: '' }));
    expect(blank.fields).toHaveProperty('title');
    expect((await mockClient.getGoals()).some(g => g.id === 'goal-career')).toBe(true);
    const habitPatch = await rejection(mockClient.updateHabit('habit-code', { title: 'x' } as never));
    expect(habitPatch.code).toBe('VALIDATION_FAILED');
    const missing = await rejection(mockClient.updateHabit('nope', { status: 'PAUSED' }));
    expect([missing.status, missing.code]).toEqual([404, 'NOT_FOUND']);
  });
});

describe('stored data', () => {
  it('migrates a version 1 database and keeps completions and XP', async () => {
    freezeAt(D0);
    const v1 = {
      version: 1,
      goals: [{ id: 'g', title: 'G', category: 'CAREER', description: '', status: 'ACTIVE', createdAt: '2026-10-01T00:00:00Z' }],
      habits: [{ id: 'h', goalId: 'g', title: 'H', targetMinutes: 30, xpReward: 40, weekdays: [1,2,3,4,5,6,7], startDate: '2026-10-10', endDate: null, status: 'ACTIVE' }],
      completions: [{ habitId: 'h', date: '2026-10-12', completedAt: '2026-10-12T01:00:00Z' }],
      xpTransactions: [
        { id: 'a', habitId: 'h', date: '2026-10-12', type: 'QUEST_COMPLETE', amount: 40, createdAt: '2026-10-12T01:00:00Z' },
        { id: 'b', habitId: 'h', date: '2026-10-11', type: 'QUEST_COMPLETE', amount: 40, createdAt: '2026-10-11T01:00:00Z' },
        { id: 'c', habitId: 'h', date: '2026-10-11', type: 'QUEST_REVERT', amount: -40, createdAt: '2026-10-11T02:00:00Z' }
      ],
      journey: { id: 'j', title: 'J', startDate: '2026-10-10', durationDays: 66, status: 'ACTIVE', elapsedDays: 0, totalScheduledToDate: 0, completedToDate: 0 }
    };
    store.set('life-os.mock.v1', JSON.stringify(v1));
    const dash = await mockClient.getDashboard('2026-10-12');
    expect(dash.progress.totalXp).toBe(40);
    expect(dash.quests[0].status).toBe('COMPLETED');
    expect((await mockClient.getDashboard('2026-10-11')).quests[0].status).toBe('PENDING');
    expect(ledger().map(e => [e.date, e.type, e.cycle])).toEqual(expect.arrayContaining([['2026-10-12', 'QUEST_COMPLETE', 1], ['2026-10-11', 'QUEST_COMPLETE', 1], ['2026-10-11', 'QUEST_REVERT', 1]]));
  });
  it('resets to the sample when stored data is damaged', async () => {
    store.set('life-os.mock.v1', '{not json');
    expect((await mockClient.getGoals()).length).toBeGreaterThan(0);
  });
});
