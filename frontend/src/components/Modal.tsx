import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Modal dialog: labelled, traps Tab, closes on Escape/backdrop, and returns focus to whatever opened it. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  const card = useRef<HTMLElement>(null);
  // Captured during the first render: an autoFocus field steals focus before effects run.
  const [opener] = useState(() => document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const node = card.current!;
    // Respect an autoFocus field inside the form; otherwise land on the first control.
    if (!node.contains(document.activeElement)) (node.querySelector<HTMLElement>(FOCUSABLE) ?? node).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close.current(); return; }
      if (e.key !== 'Tab') return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (!node.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); opener?.focus(); };
  }, []);

  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section ref={card} className="modal-card" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <div className="modal-heading"><div><span className="section-eyebrow">LIFE OS</span><h2 id={titleId}>{title}</h2></div><button onClick={onClose} className="icon-btn" aria-label="Đóng"><X size={20}/></button></div>
      {children}
    </section>
  </div>;
}
