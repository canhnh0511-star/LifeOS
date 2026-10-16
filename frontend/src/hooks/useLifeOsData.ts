import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { AchievementDto, AnalyticsDto, DailyDashboardDto, GoalDto, HabitDto } from '../api/types';

/** Loads everything the screens read. Call `refresh` after any mutation; stale responses are ignored. */
export function useLifeOsData(selectedDate: string, period: '7d' | '30d') {
  const [dashboard, setDashboard] = useState<DailyDashboardDto | null>(null);
  const [goals, setGoals] = useState<GoalDto[]>([]);
  const [habits, setHabits] = useState<HabitDto[]>([]);
  const [achievements, setAchievements] = useState<AchievementDto[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsDto | null>(null);
  const [weekly, setWeekly] = useState<AnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    let alive = true;
    // Each resource lands on its own, so one failing endpoint (e.g. one the backend has not shipped yet) never blanks the rest.
    Promise.allSettled([api.getDashboard(selectedDate), api.getGoals(), api.getHabits(), api.getAnalytics('7d'), period === '30d' ? api.getAnalytics('30d') : Promise.resolve(null), api.getAchievements()])
      .then(([d, g, h, w, m, a]) => {
        if (!alive) return;
        if (d.status === 'fulfilled') setDashboard(d.value);
        if (g.status === 'fulfilled') setGoals(g.value);
        if (h.status === 'fulfilled') setHabits(h.value);
        if (a.status === 'fulfilled') setAchievements(a.value);
        if (w.status === 'fulfilled') { setWeekly(w.value); if (m.status === 'fulfilled') setAnalytics(m.value ?? w.value); }
        const failed = [d, g, h, w, m, a].find((r): r is PromiseRejectedResult => r.status === 'rejected');
        setError(failed ? (failed.reason instanceof Error && failed.reason.message) || 'Không tải được dữ liệu.' : '');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [selectedDate, period, revision]);
  return { dashboard, goals, habits, achievements, analytics, weekly, loading, error, refresh };
}
