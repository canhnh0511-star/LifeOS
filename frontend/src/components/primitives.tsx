import type { CSSProperties, ReactNode } from 'react';
import { Home, Zap } from 'lucide-react';

export function Logo() {
  return <div className="brand"><div className="brand-symbol"><Zap size={22} fill="currentColor" strokeWidth={2.4} /></div><span>LIFE<span className="brand-light">OS</span><span className="brand-dot">.</span></span></div>;
}
export function ProgressBar({ value, variant = 'lime', size = 'regular' }: { value: number; variant?: string; size?: string }) {
  return <div className={`progress-track ${size}`}><div className={`progress-fill ${variant}`} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></div>;
}
export function CardTitle({ title, kicker, action }: { title: string; kicker?: string; action?: ReactNode }) {
  return <div className="card-title-row"><div><h3>{title}</h3>{kicker && <p className="subtle-text">{kicker}</p>}</div>{action}</div>;
}
export function IconBubble({ icon: Icon, tone = 'blue', size = 'normal' }: { icon: typeof Home; tone?: string; size?: string }) {
  return <span className={`icon-bubble tone-${tone} ${size}`}><Icon size={size === 'small' ? 17 : 20} strokeWidth={1.85} /></span>;
}
export function CircleProgress({ value, children }: { value: number; children: ReactNode }) {
  return <div className="circle-progress" style={{ '--progress': `${value}%` } as CSSProperties}><div className="circle-progress-inner">{children}</div></div>;
}
export function EmptyState({ icon: Icon, title, details, action }: { icon: typeof Home; title: string; details: string; action?: ReactNode }) {
  return <div className="empty-state"><Icon size={29} /><h3>{title}</h3><p>{details}</p>{action}</div>;
}