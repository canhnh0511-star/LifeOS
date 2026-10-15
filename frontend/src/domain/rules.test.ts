import { describe,expect,it } from 'vitest';
import { isScheduled, levelAtXp, levelProgress, longestStreakForHabit, moveDate, streakForHabit } from './rules';
import type { HabitDto } from '../api/types';
const habit:HabitDto={id:'h',goalId:'g',title:'Work',targetMinutes:30,xpReward:35,weekdays:[1,2,3,4,5],startDate:'2026-10-05',endDate:null,status:'ACTIVE'};
describe('Level progression',()=>{
 it('uses quadratic total thresholds',()=>{expect(levelAtXp(0)).toBe(1);expect(levelAtXp(399)).toBe(1);expect(levelAtXp(400)).toBe(2);expect(levelAtXp(1600)).toBe(4);expect(levelProgress(1850).nextLevelXp).toBe(2500);});
});
describe('scheduled-session streaks',()=>{
 it('does not break for weekends',()=>{
   const done=new Set(['2026-10-08','2026-10-09','2026-10-12']);
   expect(streakForHabit(habit,done,'2026-10-13')).toBe(3);
 });
 it('breaks when a scheduled day is missed',()=>{
   expect(streakForHabit(habit,new Set(['2026-10-08','2026-10-09']), '2026-10-13')).toBe(0);
 });
 it('records historical best even after a break',()=>{
   const done=new Set(['2026-10-05','2026-10-06','2026-10-07','2026-10-09']);
   expect(streakForHabit(habit,done,'2026-10-13')).toBe(0);
   expect(longestStreakForHabit(habit,done,'2026-10-12')).toBe(3);
 });
 it('handles date boundaries',()=>expect(moveDate('2026-12-31',1)).toBe('2027-01-01'));
});
describe('streaks with paused days',()=>{
 const notPaused=(d:string)=>isScheduled(habit,d)&&d!=='2026-10-09'&&d!=='2026-10-12';
 it('does not require a paused scheduled day',()=>{
   const done=new Set(['2026-10-07','2026-10-08']);
   expect(streakForHabit(habit,done,'2026-10-13',notPaused)).toBe(2);
   expect(streakForHabit(habit,new Set(['2026-10-07','2026-10-08','2026-10-13']),'2026-10-13',notPaused)).toBe(3);
 });
 it('keeps the longest run across a paused gap',()=>{
   const done=new Set(['2026-10-07','2026-10-08','2026-10-13']);
   expect(longestStreakForHabit(habit,done,'2026-10-13',notPaused)).toBe(3);
   expect(longestStreakForHabit(habit,done,'2026-10-13')).toBe(2);
 });
});
