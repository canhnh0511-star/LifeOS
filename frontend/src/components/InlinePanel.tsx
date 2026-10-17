import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronUp } from 'lucide-react';

/**
 * A panel that opens in place on the page (no popup, no separate screen): labelled, scrolled into view when it opens,
 * focus moves to its heading, Escape or "Thu gọn" collapses it. Replaces the old bottom sheets for the quest detail and the workout.
 */
export function InlinePanel({ title, eyebrow = 'LIFE OS', onClose, children }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode }) {
  const root = useRef<HTMLElement>(null), heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    root.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    heading.current?.focus({ preventScroll: true });
  }, []);
  return <section ref={root} className="panel inline-panel" role="region" aria-label={title} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
    <div className="inline-panel-head"><div><span className="section-eyebrow">{eyebrow}</span><h2 ref={heading} tabIndex={-1}>{title}</h2></div>
      <button type="button" className="btn btn-quiet" onClick={onClose}><ChevronUp size={16}/> Thu gọn</button></div>
    {children}
  </section>;
}
