/** Which chests this device has already opened (a per-viewer convenience; the XP itself is granted by the backend when the threshold is reached). */
const KEY = 'lifeos.chests.opened';
const keyOf = (date: string, tier: string) => `${date}:${tier}`;

export function loadOpened(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]); } catch { return new Set(); }
}
export const isOpened = (opened: ReadonlySet<string>, date: string, tier: string) => opened.has(keyOf(date, tier));
/** Returns the new set and stores it; a chest that went back to locked (its XP was revoked) is forgotten so the next one is a fresh reveal. */
export function withOpened(opened: ReadonlySet<string>, date: string, tier: string, open: boolean): Set<string> {
  const next = new Set(opened);
  if (open) next.add(keyOf(date, tier)); else next.delete(keyOf(date, tier));
  try { localStorage.setItem(KEY, JSON.stringify([...next].slice(-200))); } catch { /* storage unavailable: the chest stays "ready" next time */ }
  return next;
}
