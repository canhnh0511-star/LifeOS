import type { HabitDto, Weekday } from '../api/types';
export const TIMEZONE = 'Asia/Ho_Chi_Minh';
export const pad = (n: number) => String(n).padStart(2, '0');
export function todayInTimezone(timezone = TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function moveDate(date: string, days: number): string {
  const dt = new Date(`${date}T00:00:00Z`); dt.setUTCDate(dt.getUTCDate() + days); return dt.toISOString().slice(0, 10);
}
export function diffDays(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
}
export function weekday(date: string): Weekday {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); return (dow === 0 ? 7 : dow) as Weekday;
}
export function isScheduled(habit: HabitDto, date: string): boolean {
  return habit.startDate <= date && (!habit.endDate || date <= habit.endDate) && habit.weekdays.includes(weekday(date));
}
export function levelAtXp(xp: number): number { return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100))); }
export function xpForLevel(level: number): number { return level <= 1 ? 0 : 100 * level * level; }
export function levelProgress(xp: number) {
  const level = levelAtXp(xp); return { level, levelStartXp: xpForLevel(level), nextLevelXp: xpForLevel(level + 1) };
}
/**
 * Scheduled-session streak. Pending today does not break an already-earned streak.
 * `isRequired` decides whether a date needs a completion (defaults to the weekly schedule);
 * callers pass a stricter predicate to skip paused days.
 */
export function streakForHabit(habit: HabitDto, completedDates: ReadonlySet<string>, referenceDate: string, isRequired: (date: string) => boolean = date => isScheduled(habit, date)): number {
  let cursor = referenceDate;
  // Today's incomplete scheduled task is allowed to remain pending until the day ends.
  if (isRequired(cursor) && !completedDates.has(cursor)) cursor = moveDate(cursor, -1);
  let result = 0;
  for (let i = 0; i < 730 && cursor >= habit.startDate; i++, cursor = moveDate(cursor, -1)) {
    if (!isRequired(cursor)) continue;
    if (!completedDates.has(cursor)) break;
    result++;
  }
  return result;
}

/** Historical maximum of consecutive planned sessions, including gaps that broke a streak. */
export function longestStreakForHabit(habit: HabitDto, completedDates: ReadonlySet<string>, referenceDate: string, isRequired: (date: string) => boolean = date => isScheduled(habit, date)): number {
  let longest = 0;
  let run = 0;
  let cursor = habit.startDate;
  // Two-year guard mirrors current-streak lookback; production should query scheduled instances.
  for (let i = 0; i < 730 && cursor <= referenceDate; i++, cursor = moveDate(cursor, 1)) {
    if (!isRequired(cursor)) continue;
    if (completedDates.has(cursor)) { run++; longest = Math.max(longest, run); }
    else run = 0;
  }
  return longest;
}

export function formatDate(date: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC', ...options }).format(new Date(`${date}T12:00:00Z`));
}
export function categoryLabel(category: string): string {
  return ({ CAREER: 'Sự nghiệp', CREATIVITY: 'Sáng tạo', HEALTH: 'Sức khỏe', KNOWLEDGE: 'Kiến thức', MINDFULNESS: 'Tinh thần' } as Record<string, string>)[category] || category;
}
