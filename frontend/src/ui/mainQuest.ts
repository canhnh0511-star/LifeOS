import { isLibraryLine } from '../domain/exerciseLibrary';
import type { QuestDto } from '../api/types';

/**
 * Which quest is the Main Quest (RPG-02). Display priority only: the pinned quest is still one of the day's scheduled quests,
 * pays its normal XP once and is never duplicated. The pin is remembered per day on this device.
 */
const key = (date: string) => `lifeos.main-quest.${date}`;

export function loadPin(date: string): string | null {
  try { return localStorage.getItem(key(date)); } catch { return null; }
}
export function savePin(date: string, habitId: string | null): void {
  try { if (habitId) localStorage.setItem(key(date), habitId); else localStorage.removeItem(key(date)); } catch { /* storage unavailable: the pin lasts for this visit only */ }
}
/** The pinned quest while it is still unfinished; otherwise an unfinished gym session if there is one (this is a gym app first), otherwise the first unfinished quest in schedule order. */
export function pickMain(quests: readonly QuestDto[], pinnedId: string | null): QuestDto | undefined {
  const pending = quests.filter(q => q.status === 'PENDING');
  return pending.find(q => q.habitId === pinnedId) ?? pending.find(q => (q.objectives ?? []).some(isLibraryLine)) ?? pending[0];
}
/** Unfinished quests first, then finished ones; the schedule order is kept inside each group. */
export function pendingFirst<T extends { status: QuestDto['status'] }>(quests: readonly T[]): T[] {
  return [...quests.filter(q => q.status !== 'COMPLETED'), ...quests.filter(q => q.status === 'COMPLETED')];
}
