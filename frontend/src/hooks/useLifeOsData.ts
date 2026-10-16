import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { MetricDto, ItemDto, AchievementDto, AnalyticsDto, DailyDashboardDto, GoalDto, HabitDto } from '../api/types';

/** Loads everything the screens read. Call `refresh` after any mutation; stale responses are ignored. */
export function useLifeOsData(selectedDate: string, period: '7d' | '30d') {
  const [dashboard, setDashboard] = useState<DailyDashboardDto | null>(null);
  const [goals, setGoals] = useState<GoalDto[]>([]);
  const [habits, setHabits] = useState<HabitDto[]>([]);
  const [achievements, setAchievements] = useState<AchievementDto[]>([]);
  const [metrics, setMetrics] = useState<MetricDto[]>([]);
  const [metricsFailed, setMetricsFailed] = useState(false);
  const [items, setItems] = useState<ItemDto[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsDto | null>(null);
  const [weekly, setWeekly] = useState<AnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(n => n + 1), []);
  /** Body metrics are independent of the dashboard, so saving one reloads only them. */
  const reloadMetrics = useCallback(() => api.getMetrics().then(list => { setMetrics(list); setMetricsFailed(false); }).catch(() => setMetricsFailed(true)), []);
  useEffect(() => {
    let alive = true;
    // Each resource lands on its own, so one failing endpoint (e.g. one the backend has not shipped yet) never blanks the rest.
    Promise.allSettled([api.getDashboard(selectedDate), api.getGoals(), api.getHabits(), api.getAnalytics('7d'), period === '30d' ? api.getAnalytics('30d') : Promise.resolve(null), api.getAchievements(), api.getItems(), api.getMetrics()])
      .then(([d, g, h, w, m, a, it, me]) => {
        if (!alive) return;
        if (d.status === 'fulfilled') setDashboard(d.value);
        if (g.status === 'fulfilled') setGoals(g.value);
        if (h.status === 'fulfilled') setHabits(h.value);
        if (a.status === 'fulfilled') setAchievements(a.value);
        setItems(it.status === 'fulfilled' ? it.value : []);
        if (me.status === 'fulfilled') { setMetrics(me.value); setMetricsFailed(false); } else setMetricsFailed(true);
        if (w.status === 'fulfilled') { setWeekly(w.value); if (m.status === 'fulfilled') setAnalytics(m.value ?? w.value); }
        // Items are an extra: a backend without /items must not turn the whole page into an error.
        const failed = [d, g, h, w, m, a].find((r): r is PromiseRejectedResult => r.status === 'rejected');
        setError(failed ? (failed.reason instanceof Error && failed.reason.message) || 'Không tải được dữ liệu.' : '');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [selectedDate, period, revision]);
  return { dashboard, goals, habits, achievements, items, metrics, metricsFailed, reloadMetrics, analytics, weekly, loading, error, refresh };
}
