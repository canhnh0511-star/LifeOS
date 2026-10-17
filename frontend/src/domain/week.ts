import { moveDate, weekday } from './rules';

/** The Monday of the week that holds `date`, and its seven days Monday to Sunday. */
export const weekStart = (date: string) => moveDate(date, 1 - weekday(date));
export const weekDates = (date: string): string[] => { const s = weekStart(date); return Array.from({ length: 7 }, (_, i) => moveDate(s, i)); };
export const WEEKDAY_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
