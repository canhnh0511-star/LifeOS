import type { AnalyticsDto, GoalCategory } from '../api/types';
import { categoryLabel, weekday } from './rules';

export const ALL_CATEGORIES: GoalCategory[] = ['CAREER', 'CREATIVITY', 'HEALTH', 'KNOWLEDGE', 'MINDFULNESS'];

/** One radar axis. `value`/`previous` are completion percentages; null means the area had no scheduled quests (no data, not 0%). */
export interface RadarAxis { category: GoalCategory; value: number | null; previous: number | null; scheduled: number; completed: number; }
export interface Insight { id: string; tone: 'positive' | 'warning' | 'neutral'; title: string; detail: string; }

const percent = (completed: number, scheduled: number) => scheduled > 0 ? Math.round(100 * completed / scheduled) : null;
const weekdayNames: Record<number, string> = { 1: 'Thứ Hai', 2: 'Thứ Ba', 3: 'Thứ Tư', 4: 'Thứ Năm', 5: 'Thứ Sáu', 6: 'Thứ Bảy', 7: 'Chủ Nhật' };
const MIN_WEEKDAY_SAMPLES = 3;

export function radarAxes(analytics: AnalyticsDto): RadarAxis[] {
  return ALL_CATEGORIES.map(category => {
    const now = analytics.categories.find(c => c.category === category);
    const before = analytics.previous?.categories.find(c => c.category === category);
    return {
      category,
      value: percent(now?.completed ?? 0, now?.scheduled ?? 0),
      previous: percent(before?.completed ?? 0, before?.scheduled ?? 0),
      scheduled: now?.scheduled ?? 0,
      completed: now?.completed ?? 0
    };
  });
}

/** Heuristic suggestions (not AI). Order: most actionable first. */
export function buildInsights(analytics: AnalyticsDto): Insight[] {
  const result: Insight[] = [];
  const axes = radarAxes(analytics);
  const withData = axes.filter(a => a.value !== null);

  if (withData.length >= 2) {
    const weakest = withData.reduce((min, a) => (a.value as number) < (min.value as number) ? a : min);
    const strongest = withData.reduce((max, a) => (a.value as number) > (max.value as number) ? a : max);
    if (weakest.value !== strongest.value) {
      result.push({
        id: 'weakest-area', tone: 'warning', title: 'Lĩnh vực cần chú ý',
        detail: `${categoryLabel(weakest.category)} chỉ đạt ${weakest.value}% (${weakest.completed}/${weakest.scheduled} nhiệm vụ), thấp nhất trong các lĩnh vực. ${categoryLabel(strongest.category)} đang tốt nhất với ${strongest.value}%.`
      });
    }
  }

  const missing = axes.filter(a => a.value === null);
  if (missing.length > 0) {
    result.push({
      id: 'missing-areas', tone: 'neutral', title: 'Lĩnh vực chưa có nhiệm vụ',
      detail: `Chưa có nhiệm vụ nào trong kỳ này ở: ${missing.map(a => categoryLabel(a.category)).join(', ')}. Tạo một habit nhỏ để radar phản ánh đủ 5 lĩnh vực.`
    });
  }

  const before = analytics.previous;
  if (before && before.scheduledCount > 0 && analytics.scheduledCount > 0) {
    const delta = analytics.completionRate - before.completionRate;
    const days = analytics.period === '7d' ? 7 : 30;
    if (delta !== 0) {
      result.push({
        id: 'trend', tone: delta > 0 ? 'positive' : 'warning',
        title: delta > 0 ? 'Đang tiến bộ so với kỳ trước' : 'Giảm so với kỳ trước',
        detail: `Tỷ lệ hoàn thành ${analytics.completionRate}% so với ${before.completionRate}% của ${days} ngày trước đó (${delta > 0 ? '+' : ''}${delta} điểm phần trăm).`
      });
    }
  }

  const byWeekday = new Map<number, { scheduled: number; completed: number }>();
  for (const day of analytics.days) {
    if (day.scheduled === 0) continue;
    const key = weekday(day.date);
    const stat = byWeekday.get(key) ?? { scheduled: 0, completed: 0 };
    stat.scheduled += day.scheduled; stat.completed += day.completed;
    byWeekday.set(key, stat);
  }
  const eligible = [...byWeekday].filter(([, s]) => s.scheduled >= MIN_WEEKDAY_SAMPLES);
  if (eligible.length >= 2) {
    const [worstDay, worst] = eligible.reduce((min, cur) => cur[1].completed / cur[1].scheduled < min[1].completed / min[1].scheduled ? cur : min);
    const [, best] = eligible.reduce((max, cur) => cur[1].completed / cur[1].scheduled > max[1].completed / max[1].scheduled ? cur : max);
    const worstPct = Math.round(100 * worst.completed / worst.scheduled);
    const bestPct = Math.round(100 * best.completed / best.scheduled);
    if (worstPct < bestPct) {
      result.push({
        id: 'weekday', tone: 'warning', title: 'Ngày hay bỏ lỡ',
        detail: `${weekdayNames[worstDay]} là ngày bạn hoàn thành ít nhất (${worstPct}%). Thử giảm bớt nhiệm vụ hoặc chuyển sang giờ thuận tiện hơn vào ngày này.`
      });
    }
  }
  return result;
}
