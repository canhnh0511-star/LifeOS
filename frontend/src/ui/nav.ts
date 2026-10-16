import { BarChart3, Compass, Home, Ruler, UserRound } from 'lucide-react';

export type Tab = 'today' | 'journey' | 'character' | 'body' | 'insights';

export function tabFromHash(): Tab {
  const hash = typeof window === 'undefined' ? '' : window.location.hash.slice(1);
  return hash === 'journey' || hash === 'character' || hash === 'body' || hash === 'insights' ? hash : 'today';
}
export const primaryNav: { id: Tab; title: string; icon: typeof Home }[] = [
  { id: 'today', title: 'Hôm nay', icon: Home },
  { id: 'journey', title: 'Hành trình', icon: Compass },
  { id: 'character', title: 'Nhân vật', icon: UserRound },
  { id: 'body', title: 'Số đo', icon: Ruler },
  { id: 'insights', title: 'Thống kê', icon: BarChart3 }
];
