import type { LifeOsApi } from './client';
import type { AnalyticsDto, CreateGoalRequest, CreateHabitRequest, DailyDashboardDto, GoalDto, HabitDto, JourneyDto, ProgressDto, QuestDto, QuestMutationDto, UserDto } from './types';
import { categoryLabel, diffDays, isScheduled, levelProgress, longestStreakForHabit, moveDate, streakForHabit, todayInTimezone } from '../domain/rules';

const DB_KEY = 'life-os.mock.v1';
const user: UserDto = { id: 'demo-user-001', displayName: 'Cảnh', email: 'demo@lifeos.local', timezone: 'Asia/Ho_Chi_Minh' };
type Completion = { habitId: string; date: string; completedAt: string };
type XpEvent = { id: string; habitId: string; date: string; type: 'QUEST_COMPLETE' | 'QUEST_REVERT'; amount: number; createdAt: string };
type Db = { version: 1; goals: GoalDto[]; habits: HabitDto[]; completions: Completion[]; xpTransactions: XpEvent[]; journey: JourneyDto };
const id = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const now = () => new Date().toISOString();
const delay = () => new Promise(resolve => setTimeout(resolve, 100));

function seed(): Db {
  const today = todayInTimezone();
  const start = moveDate(today, -20);
  const goals: GoalDto[] = [
    { id: 'goal-career', title: 'Mastering my craft', category: 'CAREER', description: 'Phát triển chuyên môn backend, architecture và AI engineering.', status:'ACTIVE', createdAt: now() },
    { id: 'goal-creativity', title: 'Play with confidence', category:'CREATIVITY', description: 'Luyện piano để đệm hát tự nhiên và giàu cảm xúc.', status:'ACTIVE', createdAt:now() },
    { id: 'goal-health', title: 'Stronger every day', category:'HEALTH', description:'Xây dựng thể lực, năng lượng và lối sống bền vững.', status:'ACTIVE', createdAt:now() },
    { id: 'goal-knowledge', title: 'Stay curious', category:'KNOWLEDGE', description:'Đọc và khám phá kiến thức mới mỗi ngày.', status:'ACTIVE', createdAt:now() }
  ];
  const habits: HabitDto[] = [
    { id:'habit-code', goalId:'goal-career', title:'Deep work · Java & AI', targetMinutes:45, xpReward:50, weekdays:[1,2,3,4,5], startDate:start, endDate:null, status:'ACTIVE' },
    { id:'habit-piano', goalId:'goal-creativity', title:'Practice piano', targetMinutes:30, xpReward:35, weekdays:[1,2,3,4,5,6,7], startDate:start, endDate:null, status:'ACTIVE' },
    { id:'habit-reading', goalId:'goal-knowledge', title:'Read & reflect', targetMinutes:15, xpReward:20, weekdays:[1,2,3,4,5,6,7], startDate:start, endDate:null, status:'ACTIVE' },
    { id:'habit-workout', goalId:'goal-health', title:'Move your body', targetMinutes:30, xpReward:40, weekdays:[2,4,6], startDate:start, endDate:null, status:'ACTIVE' }
  ];
  const completions: Completion[] = []; const xpTransactions: XpEvent[] = [];
  for (let x=0; x<=20; x++) {
    const day=moveDate(start, x);
    for (let h=0; h<habits.length; h++) {
      const habit=habits[h];
      if (!isScheduled(habit,day)) continue;
      const done = x === 20 ? h === 0 || h === 2 : ((x*7+h*3)%11 !== 0 && (x+h)%9 !== 2);
      if (!done) continue;
      completions.push({habitId:habit.id,date:day,completedAt:now()});
      xpTransactions.push({id:id(),habitId:habit.id,date:day,type:'QUEST_COMPLETE',amount:habit.xpReward,createdAt:now()});
    }
  }
  return {version:1,goals,habits,completions,xpTransactions,journey:{id:'journey-66',title:'The 66-Day Reset',startDate:start,durationDays:66,status:'ACTIVE',elapsedDays:21,totalScheduledToDate:0,completedToDate:0}};
}
function load():Db {
  try { const stored=localStorage.getItem(DB_KEY); if (stored) {
    const parsed=JSON.parse(stored) as Db;
    if (parsed.version===1 && Array.isArray(parsed.goals) && Array.isArray(parsed.xpTransactions)) return parsed;
  }} catch { /* damaged demo state resets to sample */ }
  const db=seed(); save(db); return db;
}
function save(db:Db){ localStorage.setItem(DB_KEY,JSON.stringify(db)); }
function requireHabit(db:Db,habitId:string){const habit=db.habits.find(h=>h.id===habitId);if(!habit)throw new Error('Không tìm thấy thói quen.');return habit;}
function completionsFor(db:Db,habitId:string){return new Set(db.completions.filter(c=>c.habitId===habitId).map(c=>c.date));}
function totalXp(db:Db){return Math.max(0,db.xpTransactions.reduce((sum,e)=>sum+e.amount,0));}
function progress(db:Db,date=todayInTimezone()):ProgressDto {
  const xp=totalXp(db);
  const active=db.habits.filter(h=>h.status==='ACTIVE');
  const streaks=active.map(h=>streakForHabit(h,completionsFor(db,h.id),date));
  const historical=active.map(h=>longestStreakForHabit(h,completionsFor(db,h.id),date));
  return {totalXp:xp,...levelProgress(xp), currentStreak:Math.max(0,...streaks),longestStreak:Math.max(0,...historical)};
}
function quests(db:Db,date:string):QuestDto[]{
  return db.habits.filter(h=>h.status==='ACTIVE'&&db.goals.some(g=>g.id===h.goalId&&g.status==='ACTIVE')&&isScheduled(h,date)).map(h=>{
    const goal=db.goals.find(g=>g.id===h.goalId);
    const completion=db.completions.find(c=>c.habitId===h.id&&c.date===date);
    return {habitId:h.id,goalId:h.goalId,goalTitle:goal?.title??'',title:h.title,targetMinutes:h.targetMinutes,xpReward:h.xpReward,category:goal?.category??'CAREER',date,status:completion?'COMPLETED':'PENDING',completedAt:completion?.completedAt??null};
  });
}
function journey(db:Db):JourneyDto {
  const today=todayInTimezone(); const final=moveDate(db.journey.startDate,db.journey.durationDays-1);
  const last=today>final?final:today; const elapsed=Math.max(0,Math.min(db.journey.durationDays,diffDays(db.journey.startDate,today)+1));
  let scheduled=0,completed=0;
  for(let d=db.journey.startDate;d<=last;d=moveDate(d,1)){
    const todays=quests(db,d);scheduled+=todays.length;completed+=todays.filter(q=>q.status==='COMPLETED').length;
  }
  return {...db.journey,elapsedDays:elapsed,totalScheduledToDate:scheduled,completedToDate:completed};
}
function analytics(db:Db,period:'7d'|'30d'):AnalyticsDto {
  const today=todayInTimezone();const length=period==='7d'?7:30;
  const days=[];const categoryMap=new Map<string,{scheduled:number;completed:number}>();
  for(let offset=length-1;offset>=0;offset--){
    const date=moveDate(today,-offset); const daily=quests(db,date);const completed=daily.filter(q=>q.status==='COMPLETED');
    days.push({date,scheduled:daily.length,completed:completed.length,xpEarned:db.xpTransactions.filter(t=>t.date===date).reduce((a,t)=>a+t.amount,0)});
    for(const q of daily){const stat=categoryMap.get(q.category)??{scheduled:0,completed:0};stat.scheduled++;if(q.status==='COMPLETED')stat.completed++;categoryMap.set(q.category,stat);}
  }
  const scheduledCount=days.reduce((a,d)=>a+d.scheduled,0);const completedCount=days.reduce((a,d)=>a+d.completed,0);
  return {period,days,scheduledCount,completedCount,completionRate:scheduledCount?Math.round(completedCount/scheduledCount*100):0,earnedXp:days.reduce((a,d)=>a+d.xpEarned,0),categories:[...categoryMap].map(([category,values])=>({category:category as AnalyticsDto['categories'][number]['category'],...values}))};
}
function canModify(date:string) {
  const today=todayInTimezone();if(date>today)throw new Error('Chưa thể hoàn thành nhiệm vụ trong tương lai.');
  if(diffDays(date,today)>7)throw new Error('Chỉ có thể điều chỉnh nhiệm vụ trong 7 ngày gần nhất.');
}
async function mutateQuest(habitId:string,date:string,complete:boolean):Promise<QuestMutationDto>{
  await delay(); const db=load();canModify(date);
  const habit=requireHabit(db,habitId);
  if(habit.status!=='ACTIVE'||!isScheduled(habit,date))throw new Error('Ngày này không thuộc lịch thực hiện của thói quen.');
  const current=db.completions.find(c=>c.habitId===habitId&&c.date===date);
  let xpAwarded=0;
  if(complete&&!current){
    db.completions.push({habitId,date,completedAt:now()});
    xpAwarded=habit.xpReward;
    db.xpTransactions.push({id:id(),habitId,date,type:'QUEST_COMPLETE',amount:xpAwarded,createdAt:now()});
  } else if(!complete&&current){
    db.completions=db.completions.filter(c=>!(c.habitId===habitId&&c.date===date));
    xpAwarded=-habit.xpReward;
    db.xpTransactions.push({id:id(),habitId,date,type:'QUEST_REVERT',amount:xpAwarded,createdAt:now()});
  }
  save(db);const p=progress(db);
  return {habitId,date,status:complete?'COMPLETED':'PENDING',xpAwarded,totalXp:p.totalXp,level:p.level,streak:streakForHabit(habit,completionsFor(db,habitId),todayInTimezone())};
}
export const mockClient:LifeOsApi={
  async getMe(){await delay();return user;},
  async getDashboard(date=todayInTimezone()):Promise<DailyDashboardDto>{
    await delay();const db=load();const list=quests(db,date);
    return {date,user,quests:list,progress:progress(db),completedCount:list.filter(q=>q.status==='COMPLETED').length,scheduledCount:list.length,earnedXpToday:db.xpTransactions.filter(e=>e.date===date).reduce((a,e)=>a+e.amount,0),journey:journey(db)};
  },
  async getGoals(){await delay();return load().goals;},
  async createGoal(input:CreateGoalRequest){await delay();if(!input.title.trim())throw new Error('Tên mục tiêu không được để trống.');const db=load();const goal:GoalDto={id:id(),title:input.title.trim(),category:input.category,description:input.description.trim(),status:'ACTIVE',createdAt:now()};db.goals.push(goal);save(db);return goal;},
  async updateGoal(goalId,patch){await delay();const db=load();const goal=db.goals.find(g=>g.id===goalId);if(!goal)throw new Error('Không tìm thấy mục tiêu.');Object.assign(goal,patch);save(db);return goal;},
  async getHabits(){await delay();return load().habits;},
  async createHabit(input:CreateHabitRequest){await delay();const db=load();if(!db.goals.some(g=>g.id===input.goalId&&g.status==='ACTIVE'))throw new Error('Vui lòng chọn mục tiêu đang hoạt động.');if(!input.title.trim()||input.weekdays.length===0||input.targetMinutes<1||input.xpReward<0||input.xpReward>100)throw new Error('Thông tin thói quen không hợp lệ.');const habit:HabitDto={id:id(),title:input.title.trim(),goalId:input.goalId,targetMinutes:input.targetMinutes,xpReward:input.xpReward,weekdays:[...new Set(input.weekdays)].sort(),startDate:input.startDate,endDate:null,status:'ACTIVE'};db.habits.push(habit);save(db);return habit;},
  async updateHabit(habitId,patch){await delay();const db=load();const habit=requireHabit(db,habitId);Object.assign(habit,patch);save(db);return habit;},
  async getQuests(date){await delay();return quests(load(),date);},
  completeQuest:(habitId,date)=>mutateQuest(habitId,date,true),
  undoQuest:(habitId,date)=>mutateQuest(habitId,date,false),
  async getProgress(){await delay();return progress(load());},
  async getAnalytics(period){await delay();return analytics(load(),period);},
  async getCurrentJourney(){await delay();return journey(load());}
};
export function resetDemoData(){localStorage.removeItem(DB_KEY);}
export function exportDemoData(){return JSON.stringify(load(),null,2);}
export { categoryLabel };
