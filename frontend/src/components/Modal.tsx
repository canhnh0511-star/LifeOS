import { useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';

/** Modal dialog: labelled, traps Tab, closes on Escape/backdrop, and returns focus to whatever opened it. */
export function Modal({ title, onClose, children, sheet = false }: { title: string; onClose: () => void; children: ReactNode; sheet?: boolean }) {
  const titleId = useId();
  const card = useRef<HTMLElement>(null);
  useDialog(card, onClose);
  return <div className={`modal-backdrop${sheet ? ' is-sheet' : ''}`} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section ref={card} className="modal-card" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <div className="modal-heading"><div><span className="section-eyebrow">LIFE OS</span><h2 id={titleId}>{title}</h2></div><button onClick={onClose} className="icon-btn" aria-label="Đóng"><X size={20}/></button></div>
      {children}
    </section>
  </div>;
}
