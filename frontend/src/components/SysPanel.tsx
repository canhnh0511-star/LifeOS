import type { ReactNode } from 'react';

/** The "Hệ thống" window: a glass panel whose label sits on the top border. `tone` picks the border colour. */
export function SysPanel({ label, tone = 'cyan', className = '', children }: { label: string; tone?: 'cyan' | 'red' | 'purple' | 'green'; className?: string; children: ReactNode }) {
  return <section className={`sys-panel sys-${tone} ${className}`.trim()} aria-label={label}><span className="sys-panel-tag">{label}</span>{children}</section>;
}
