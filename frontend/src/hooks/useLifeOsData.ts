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
    Promise.all([api.getDashboard(selectedDate), api.getGoals(), api.getHabits(), api.getAnalytics('7d'), period === '30d' ? api.getAnalytics('30d') : Promise.resolve(null), api.getAchievements()])
      .then(([d, g, h, w, m, a]) => { if (alive) { setDashboard(d); setAchievements(a); setGoals(g); setHabits(h); setWeekly(w); setAnalytics(m ?? w); setError(''); } })
      .catch((e: Error) => { if (alive) setError(e.message || 'Không tải được dữ liệu.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [selectedDate, period, revision]);
  return { dashboard, goals, habits, achievements, analytics, weekly, loading, error, refresh };
}
