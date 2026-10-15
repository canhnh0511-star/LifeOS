import type { LifeOsApi } from './client';
import type { CreateGoalRequest, CreateHabitRequest, GoalDto, HabitDto } from './types';
const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    credentials: 'include', headers: { 'Content-Type': 'application/json', ...init?.headers }, ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}
export const httpClient: LifeOsApi = {
  getMe: () => request('/me'),
  getDashboard: date => request(`/dashboard/today${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  getGoals: () => request('/goals'),
  createGoal: (input: CreateGoalRequest) => request('/goals', { method: 'POST', body: JSON.stringify(input) }),
  updateGoal: (id: string, patch: Partial<Pick<GoalDto,'title'|'description'|'status'>>) => request(`/goals/${id}`, { method:'PATCH', body: JSON.stringify(patch) }),
  getHabits: () => request('/habits'),
  createHabit: (input: CreateHabitRequest) => request('/habits', { method: 'POST', body: JSON.stringify(input) }),
  updateHabit: (id: string, patch: Partial<Pick<HabitDto,'status'>>) => request(`/habits/${id}`, { method:'PATCH', body: JSON.stringify(patch) }),
  getQuests: date => request(`/quests?date=${encodeURIComponent(date)}`),
  completeQuest: (habitId, date) => request(`/quests/${habitId}/dates/${date}/completion`, { method:'PUT' }),
  undoQuest: (habitId, date) => request(`/quests/${habitId}/dates/${date}/completion`, { method:'DELETE' }),
  getProgress: () => request('/progress'),
  getAnalytics: period => request(`/analytics/${period === '7d' ? 'weekly' : 'monthly'}`),
  getCurrentJourney: () => request('/journeys/current'),
};
