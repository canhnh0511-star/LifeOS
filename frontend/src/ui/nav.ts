import { BarChart3, BookOpen, Compass, Home, Ruler, UserRound } from 'lucide-react';

export type Tab = 'today' | 'exercises' | 'insights' | 'character' | 'journey' | 'body';
const TABS: readonly Tab[] = ['today', 'exercises', 'insights', 'character', 'journey', 'body'];

export function tabFromHash(): Tab {
  const hash = typeof window === 'undefined' ? '' : window.location.hash.slice(1);
  return (TABS as readonly string[]).includes(hash) ? hash as Tab : 'today';
}
interface NavItem { id: Tab; title: string; icon: typeof Home }
/** Gym v1: four destinations (bottom bar and side menu). */
export const primaryNav: NavItem[] = [
  { id: 'today', title: 'Hôm nay', icon: Home },
  { id: 'exercises', title: 'Bài tập', icon: BookOpen },
  { id: 'insights', title: 'Tiến độ', icon: BarChart3 },
  { id: 'character', title: 'Nhân vật', icon: UserRound }
];
/** Still there, only out of the way: side menu only. Their data and screens are untouched. */
export const moreNav: NavItem[] = [
  { id: 'journey', title: 'Hành trình', icon: Compass },
  { id: 'body', title: 'Số đo', icon: Ruler }
];
