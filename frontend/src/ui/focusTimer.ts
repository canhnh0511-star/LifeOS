/**
 * Local session stopwatch for a quest (RPG-03). Pure helpers over timestamps, so a reload can rebuild the elapsed time.
 * It is a personal aid, not proof of work: nothing here calls the API, awards XP or completes a quest.
 */
export interface TimerState { startedAt: number | null; accumulatedMs: number; }
export const idleTimer: TimerState = { startedAt: null, accumulatedMs: 0 };

export const startTimer = (s: TimerState, now: number): TimerState => s.startedAt === null ? { ...s, startedAt: now } : s;
export const pauseTimer = (s: TimerState, now: number): TimerState => s.startedAt === null ? s : { startedAt: null, accumulatedMs: elapsedMs(s, now) };
export const elapsedMs = (s: TimerState, now: number): number => s.accumulatedMs + (s.startedAt === null ? 0 : Math.max(0, now - s.startedAt));
export const isRunning = (s: TimerState) => s.startedAt !== null;

/** 83 -> "01:23"; an hour or more shows "1:01:23". */
export function clock(totalSeconds: number): string {
  const t = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}

const key = (habitId: string, date: string) => `lifeos.timer.${habitId}:${date}`;
export function loadTimer(habitId: string, date: string): TimerState {
  try {
    const v = JSON.parse(localStorage.getItem(key(habitId, date)) ?? 'null') as Partial<TimerState> | null;
    if (v && typeof v.accumulatedMs === 'number' && v.accumulatedMs >= 0 && (v.startedAt === null || typeof v.startedAt === 'number')) return { startedAt: v.startedAt ?? null, accumulatedMs: v.accumulatedMs };
  } catch { /* unreadable: start again from zero */ }
  return idleTimer;
}
export function saveTimer(habitId: string, date: string, s: TimerState): void {
  try { if (s === idleTimer || (s.startedAt === null && s.accumulatedMs === 0)) localStorage.removeItem(key(habitId, date)); else localStorage.setItem(key(habitId, date), JSON.stringify(s)); } catch { /* storage unavailable: the timer lasts for this visit only */ }
}
