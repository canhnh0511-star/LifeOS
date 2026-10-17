/** Reduced-motion preference: follows the system unless the user turns it on here. Stored per browser; it never touches XP or any API. */
const KEY = 'lifeos:ui:reduce-motion';

export function reduceMotionPref(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}
export function applyMotionPref(on: boolean = reduceMotionPref()): void {
  if (typeof document === 'undefined') return;
  if (on) document.documentElement.setAttribute('data-motion', 'reduce'); else document.documentElement.removeAttribute('data-motion');
}
export function setReduceMotionPref(on: boolean): void {
  try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* storage blocked: the setting lasts for this visit only */ }
  applyMotionPref(on);
}
/** True when animation should be skipped, from the system setting or this app's own switch. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return reduceMotionPref() || document.documentElement.getAttribute('data-motion') === 'reduce' || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
