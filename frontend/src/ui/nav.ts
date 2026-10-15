import { BarChart3, Compass, Home } from 'lucide-react';

export type Tab = 'today' | 'journey' | 'insights';

export function tabFromHash(): Tab {
  const hash = typeof window === 'undefined' ? '' : window.location.hash.slice(1);
  return hash === 'journey' || hash === 'insights' ? hash : 'today';
}
export const primaryNav: { id: Tab; title: string; icon: typeof Home }[] = [
  { id: 'today', title: 'Hôm nay', icon: Home },
  { id: 'journey', title: 'Hành trình', icon: Compass },
  { id: 'insights', title: 'Thống kê', icon: BarChart3 }
];
