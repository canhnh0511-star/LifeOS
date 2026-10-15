import { describe, expect, it } from 'vitest';
import { ALL_CATEGORIES, buildInsights, radarAxes } from './insights';
import type { AnalyticsDto } from '../api/types';

const base: AnalyticsDto = {
  period: '7d', days: [], completionRate: 70, completedCount: 7, scheduledCount: 10, earnedXp: 100,
  categories: [
    { category: 'CAREER', scheduled: 4, completed: 4 },
    { category: 'HEALTH', scheduled: 4, completed: 1 },
    { category: 'KNOWLEDGE', scheduled: 2, completed: 2 }
  ]
};

describe('radarAxes', () => {
  it('always returns the five areas in a fixed order', () => {
    expect(radarAxes(base).map(a => a.category)).toEqual(ALL_CATEGORIES);
  });
  it('marks areas without scheduled quests as no data, not 0%', () => {
    const axes = radarAxes(base);
    const mind = axes.find(a => a.category === 'MINDFULNESS')!;
    expect(mind.value).toBeNull();
    expect(axes.find(a => a.category === 'HEALTH')!.value).toBe(25);
    expect(axes.find(a => a.category === 'CAREER')!.value).toBe(100);
  });
  it('attaches the previous period value when present', () => {
    const withPrev: AnalyticsDto = { ...base, previous: { completionRate: 50, completedCount: 2, scheduledCount: 4, earnedXp: 0, categories: [{ category: 'CAREER', scheduled: 4, completed: 2 }] } };
    const career = radarAxes(withPrev).find(a => a.category === 'CAREER')!;
    expect(career.previous).toBe(50);
    expect(radarAxes(withPrev).find(a => a.category === 'HEALTH')!.previous).toBeNull();
  });
});

describe('buildInsights', () => {
  it('names the weakest area that has data', () => {
    const weakest = buildInsights(base).find(i => i.id === 'weakest-area');
    expect(weakest?.detail).toContain('Sức khỏe');
  });
  it('does not name a weakest area when fewer than two areas have data', () => {
    const one: AnalyticsDto = { ...base, categories: [{ category: 'CAREER', scheduled: 3, completed: 1 }] };
    expect(buildInsights(one).some(i => i.id === 'weakest-area')).toBe(false);
  });
  it('suggests creating habits for areas with no data', () => {
    const missing = buildInsights(base).find(i => i.id === 'missing-areas');
    expect(missing?.detail).toContain('Sáng tạo');
    expect(missing?.detail).toContain('Tinh thần');
  });
  it('compares with the previous period only when it had scheduled quests', () => {
    const up: AnalyticsDto = { ...base, previous: { completionRate: 40, completedCount: 4, scheduledCount: 10, earnedXp: 0, categories: [] } };
    expect(buildInsights(up).find(i => i.id === 'trend')?.tone).toBe('positive');
    const none: AnalyticsDto = { ...base, previous: { completionRate: 0, completedCount: 0, scheduledCount: 0, earnedXp: 0, categories: [] } };
    expect(buildInsights(none).some(i => i.id === 'trend')).toBe(false);
  });
  it('finds the weekday most often missed once there are enough samples', () => {
    // 2026-10-05 is a Monday; 4 Mondays + 4 Tuesdays
    const days = [] as AnalyticsDto['days'];
    for (let w = 0; w < 4; w++) {
      const mon = new Date(Date.UTC(2026, 9, 5 + 7 * w)).toISOString().slice(0, 10);
      const tue = new Date(Date.UTC(2026, 9, 6 + 7 * w)).toISOString().slice(0, 10);
      days.push({ date: mon, scheduled: 2, completed: 0, xpEarned: 0 }, { date: tue, scheduled: 2, completed: 2, xpEarned: 0 });
    }
    const found = buildInsights({ ...base, period: '30d', days }).find(i => i.id === 'weekday');
    expect(found?.detail).toContain('Thứ Hai');
    expect(buildInsights({ ...base, days: days.slice(0, 2) }).some(i => i.id === 'weekday')).toBe(false);
  });
});
