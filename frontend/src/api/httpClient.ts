import type { LifeOsApi } from './client';
import type { ApiErrorDto, CreateGoalRequest, CreateHabitRequest, GoalDto, HabitDto } from './types';
import { ApiError, ErrorCode } from './errors';
const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
const TIMEOUT_MS = 15000;
/** Double-submit CSRF: echo the readable XSRF-TOKEN cookie in a header on every mutation. The session cookie stays HttpOnly. */
const csrfToken = () => typeof document === 'undefined' ? undefined : document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length);
const isMutation = (method?: string) => !!method && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init, credentials: 'include', signal: controller.signal,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(isMutation(init.method) && csrfToken() ? { 'X-XSRF-TOKEN': decodeURIComponent(csrfToken()!) } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw controller.signal.aborted
      ? new ApiError(0, ErrorCode.timeout, 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.')
      : new ApiError(0, ErrorCode.network, 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.');
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as Partial<ApiErrorDto> | null;
    const fallback = response.status === 401 ? ErrorCode.unauthenticated : ErrorCode.http;
    throw new ApiError(response.status, body?.code ?? fallback, body?.message ?? `HTTP ${response.status}`, body?.fields, body?.requestId ?? response.headers.get('X-Request-Id') ?? undefined);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export const httpClient: LifeOsApi = {
  getMe: () => request('/me'),
  register: input => request('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  login: input => request('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getDashboard: date => request(`/dashboard/today${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  getGoals: () => request('/goals'),
  createGoal: (input: CreateGoalRequest) => request('/goals', { method: 'POST', body: JSON.stringify(input) }),
  updateGoal: (id: string, patch: Partial<Pick<GoalDto,'title'|'description'|'status'>>) => request(`/goals/${id}`, { method:'PATCH', body: JSON.stringify(patch) }),
  getHabits: () => request('/habits'),
  createHabit: (input: CreateHabitRequest) => request('/habits', { method: 'POST', body: JSON.stringify(input) }),
  updateHabit: (id: string, patch: Partial<Pick<HabitDto,'status'>>) => request(`/habits/${id}`, { method:'PATCH', body: JSON.stringify(patch) }),
  importHabitPlan: input => request('/imports/habit-plans', { method: 'POST', body: JSON.stringify(input) }),
  getQuests: date => request(`/quests?date=${encodeURIComponent(date)}`),
  completeQuest: (habitId, date) => request(`/quests/${habitId}/dates/${date}/completion`, { method:'PUT' }),
  undoQuest: (habitId, date) => request(`/quests/${habitId}/dates/${date}/completion`, { method:'DELETE' }),
  defeatBoss: bossId => request(`/bosses/${bossId}/completion`, { method:'PUT' }),
  undoBoss: bossId => request(`/bosses/${bossId}/completion`, { method:'DELETE' }),
  getAchievements: () => request('/achievements'),
  getProgress: () => request('/progress'),
  getAnalytics: period => request(`/analytics/${period === '7d' ? 'weekly' : 'monthly'}`),
  getCurrentJourney: () => request('/journeys/current'),
};
