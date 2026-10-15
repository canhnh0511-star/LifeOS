import { useEffect, useRef, useState, type RefObject } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Shared dialog behaviour: focus moves inside on open (keeping an autoFocus field), Tab/Shift+Tab stay inside,
 * Escape closes, and focus returns to whatever opened the dialog.
 */
export function useDialog(node: RefObject<HTMLElement | null>, onClose: () => void) {
  // Captured during the first render: an autoFocus field steals focus before effects run. `body` means nothing had focus
  // (e.g. a disabled button lost it while busy), so it is not worth restoring to.
  const [opener] = useState(() => document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null);
  const autoFocused = useRef<HTMLElement | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const root = node.current!;
    // StrictMode runs this effect twice and the first cleanup returns focus to the opener, so remember the
    // field that grabbed focus on its own (autoFocus) and move it back instead of jumping to the first control.
    if (root.contains(document.activeElement)) autoFocused.current ??= document.activeElement as HTMLElement;
    (autoFocused.current ?? root.querySelector<HTMLElement>(FOCUSABLE) ?? root).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close.current(); return; }
      if (e.key !== 'Tab') return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (!root.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // The opener can be gone by now (e.g. its button was replaced); fall back to a landmark marked for that.
      const target = opener?.isConnected ? opener : document.querySelector<HTMLElement>('[data-dialog-fallback]');
      target?.focus();
    };
  }, [node, opener]);
}
