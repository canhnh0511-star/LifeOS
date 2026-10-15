import type { LifeOsApi } from './client';
import type { AnalyticsDto, CreateGoalRequest, CreateHabitRequest, DailyDashboardDto, GoalCategory, GoalDto, HabitDto, JourneyDto, ProgressDto, QuestDto, QuestMutationDto, RecordStatus, UserDto } from './types';
import { ApiError, ErrorCode } from './errors';
import { ALL_CATEGORIES } from '../domain/insights';
import { categoryLabel, diffDays, isScheduled, levelProgress, longestStreakForHabit, moveDate, streakForHabit, todayInTimezone } from '../domain/rules';

const DB_KEY = 'life-os.mock.v1';
const DB_VERSION = 2;
const MAX_BACKDATE_DAYS = 7;
const user: UserDto = { id: 'demo-user-001', displayName: 'Cảnh', email: 'demo@lifeos.local', timezone: 'Asia/Ho_Chi_Minh' };

/** A status change that takes effect on `effectiveDate` (the next local day after the request). */
type LifecycleEvent = { effectiveDate: string; status: RecordStatus };
/** Mutable state of one materialized quest (habit + local date). `cycle` counts completions, as in docs/DATA_MODEL.md. */
type QuestState = { habitId: string; date: string; status: 'PENDING' | 'COMPLETED'; cycle: number; completedAt: string | null };
/** Append-only ledger entry. Never edited or removed. `date` is the quest's local date. */
type XpEvent = { id: string; habitId: string; date: string; category: GoalCategory; type: 'QUEST_COMPLETE' | 'QUEST_REVERT'; cycle: number; amount: number; createdAt: string };
type Lifecycle = { goals: Record<string, LifecycleEvent[]>; habits: Record<string, LifecycleEvent[]> };
type Db = { version: typeof DB_VERSION; goals: GoalDto[]; habits: HabitDto[]; lifecycle: Lifecycle; questStates: QuestState[]; xpTransactions: XpEvent[]; journey: JourneyDto };

const id = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const now = () => new Date().toISOString();
const delay = () => new Promise(resolve => setTimeout(resolve, 100));

// ---------- errors and validation ----------
function fail(fields: Record<string, string>): never {
  throw new ApiError(422, ErrorCode.validation, Object.values(fields)[0] ?? 'Dữ liệu không hợp lệ.', fields);
}
const notFound = (what: string) => new ApiError(404, ErrorCode.notFound, `Không tìm thấy ${what}.`);
const isLocalDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && moveDate(value, 0) === value;
const assertLocalDate = (value: unknown, field = 'date') => { if (!isLocalDate(value)) fail({ [field]: 'Ngày phải có dạng YYYY-MM-DD.' }); };
const isInt = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
function checkTitle(fields: Record<string, string>, value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) fields.title = `${label} không được để trống.`;
  else if (value.trim().length > 150) fields.title = `${label} tối đa 150 ký tự.`;
}
function checkDescription(fields: Record<string, string>, value: unknown) {
  if (typeof value !== 'string' || value.trim().length > 600) fields.description = 'Mô tả tối đa 600 ký tự.';
}
function checkStatus(fields: Record<string, string>, value: unknown) {
  if (value !== 'ACTIVE' && value !== 'PAUSED' && value !== 'ARCHIVED') fields.status = 'Trạng thái không hợp lệ.';
}
function assertOnlyKeys(patch: object, allowed: string[]) {
  const keys = Object.keys(patch);
  if (!keys.length || keys.some(key => !allowed.includes(key))) fail({ patch: `Chỉ được cập nhật: ${allowed.join(', ')}.` });
}

// ---------- history-aware rules ----------
/** Latest lifecycle status in force on `date`; records start ACTIVE. */
function statusOn(events: LifecycleEvent[] | undefined, date: string): RecordStatus {
  let status: RecordStatus = 'ACTIVE';
  for (const event of events ?? []) if (event.effectiveDate <= date) status = event.status;
  return status;
}
/** Habit and its goal were both active on `date` (ignores the weekly schedule). */
function lifecycleActive(db: Db, habit: HabitDto, date: string): boolean {
  return statusOn(db.lifecycle.habits[habit.id], date) === 'ACTIVE' && statusOn(db.lifecycle.goals[habit.goalId], date) === 'ACTIVE' && db.goals.some(g => g.id === habit.goalId);
}
/** The single definition of "a quest exists for this habit on this date", used by every read and write. */
function isQuestOn(db: Db, habit: HabitDto, date: string): boolean {
  return isScheduled(habit, date) && lifecycleActive(db, habit, date);
}
/** Records a status change that applies from tomorrow, so already-lived days are never rewritten. */
function recordStatus(db: Db, kind: keyof Lifecycle, record: GoalDto | HabitDto, status: RecordStatus) {
  if (record.status === status) return;
  const events = db.lifecycle[kind][record.id] ?? (db.lifecycle[kind][record.id] = []);
  events.push({ effectiveDate: moveDate(todayInTimezone(), 1), status });
  record.status = status;
}

// ---------- seed and storage ----------
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
  const questStates: QuestState[] = []; const xpTransactions: XpEvent[] = [];
  for (let x=0; x<=20; x++) {
    const day=moveDate(start, x);
    for (let h=0; h<habits.length; h++) {
      const habit=habits[h];
      if (!isScheduled(habit,day)) continue;
      const done = x === 20 ? h === 0 || h === 2 : ((x*7+h*3)%11 !== 0 && (x+h)%9 !== 2);
      if (!done) continue;
      const category = goals.find(g => g.id === habit.goalId)!.category;
      questStates.push({habitId:habit.id,date:day,status:'COMPLETED',cycle:1,completedAt:now()});
      xpTransactions.push({id:id(),habitId:habit.id,date:day,category,type:'QUEST_COMPLETE',cycle:1,amount:habit.xpReward,createdAt:now()});
    }
  }
  return {version:DB_VERSION,goals,habits,lifecycle:{goals:{},habits:{}},questStates,xpTransactions,journey:{id:'journey-66',title:'The 66-Day Reset',startDate:start,durationDays:66,status:'ACTIVE',elapsedDays:21,totalScheduledToDate:0,completedToDate:0}};
}
/** Version 1 stored completions without cycles and kept paused records hidden for all time. */
type DbV1 = { version: 1; goals: GoalDto[]; habits: HabitDto[]; completions: { habitId: string; date: string; completedAt: string }[]; xpTransactions: { id: string; habitId: string; date: string; type: 'QUEST_COMPLETE' | 'QUEST_REVERT'; amount: number; createdAt: string }[]; journey: JourneyDto };
function migrateV1(old: DbV1): Db {
  const lifecycle: Lifecycle = { goals: {}, habits: {} };
  const tomorrow = moveDate(todayInTimezone(), 1);
  for (const goal of old.goals) if (goal.status !== 'ACTIVE') lifecycle.goals[goal.id] = [{ effectiveDate: tomorrow, status: goal.status }];
  for (const habit of old.habits) if (habit.status !== 'ACTIVE') lifecycle.habits[habit.id] = [{ effectiveDate: tomorrow, status: habit.status }];
  const cycles = new Map<string, number>();
  const xpTransactions: XpEvent[] = [...old.xpTransactions].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(event => {
    const key = `${event.habitId}|${event.date}`;
    const cycle = event.type === 'QUEST_COMPLETE' ? (cycles.get(key) ?? 0) + 1 : Math.max(1, cycles.get(key) ?? 1);
    cycles.set(key, cycle);
    const habit = old.habits.find(h => h.id === event.habitId);
    const category = old.goals.find(g => g.id === habit?.goalId)?.category ?? 'CAREER';
    return { id: event.id, habitId: event.habitId, date: event.date, category, type: event.type, cycle, amount: event.amount, createdAt: event.createdAt };
  });
  const questStates: QuestState[] = old.completions.map(c => ({ habitId: c.habitId, date: c.date, status: 'COMPLETED', cycle: cycles.get(`${c.habitId}|${c.date}`) ?? 1, completedAt: c.completedAt }));
  return { version: DB_VERSION, goals: old.goals, habits: old.habits, lifecycle, questStates, xpTransactions, journey: old.journey };
}
function load():Db {
  try { const stored=localStorage.getItem(DB_KEY); if (stored) {
    const parsed=JSON.parse(stored) as Db | DbV1;
    if (parsed.version===DB_VERSION && Array.isArray(parsed.goals) && Array.isArray(parsed.xpTransactions) && Array.isArray((parsed as Db).questStates)) return parsed as Db;
    if (parsed.version===1 && Array.isArray(parsed.goals) && Array.isArray(parsed.habits) && Array.isArray(parsed.completions) && Array.isArray(parsed.xpTransactions)) { const migrated=migrateV1(parsed); save(migrated); return migrated; }
  }} catch { /* damaged demo state resets to sample */ }
  const db=seed(); save(db); return db;
}
function save(db:Db){ localStorage.setItem(DB_KEY,JSON.stringify(db)); }

// ---------- read models ----------
function requireHabit(db:Db,habitId:string){const habit=db.habits.find(h=>h.id===habitId);if(!habit)throw notFound('thói quen');return habit;}
function stateOf(db:Db,habitId:string,date:string){return db.questStates.find(s=>s.habitId===habitId&&s.date===date);}
function completedDates(db:Db,habitId:string){return new Set(db.questStates.filter(s=>s.habitId===habitId&&s.status==='COMPLETED').map(s=>s.date));}
function totalXp(db:Db){return Math.max(0,db.xpTransactions.reduce((sum,e)=>sum+e.amount,0));}
function progress(db:Db,date=todayInTimezone()):ProgressDto {
  const xp=totalXp(db);
  // Paused days are not required sessions, so they neither extend nor break a streak.
  const required=(habit:HabitDto)=>(d:string)=>isQuestOn(db,habit,d);
  const current=db.habits.filter(h=>lifecycleActive(db,h,date)).map(h=>streakForHabit(h,completedDates(db,h.id),date,required(h)));
  const historical=db.habits.map(h=>longestStreakForHabit(h,completedDates(db,h.id),date,required(h)));
  return {totalXp:xp,...levelProgress(xp), currentStreak:Math.max(0,...current),longestStreak:Math.max(0,...historical)};
}
function quests(db:Db,date:string):QuestDto[]{
  return db.habits.filter(h=>isQuestOn(db,h,date)).map(h=>{
    const goal=db.goals.find(g=>g.id===h.goalId);
    const state=stateOf(db,h.id,date);
    return {habitId:h.id,goalId:h.goalId,goalTitle:goal?.title??'',title:h.title,targetMinutes:h.targetMinutes,xpReward:h.xpReward,category:goal?.category??'CAREER',date,status:state?.status??'PENDING',completedAt:state?.completedAt??null};
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
function periodStats(db:Db,endDate:string,length:number){
  const days:AnalyticsDto['days']=[];const categoryMap=new Map<string,{scheduled:number;completed:number}>();
  for(let offset=length-1;offset>=0;offset--){
    const date=moveDate(endDate,-offset); const daily=quests(db,date);const completed=daily.filter(q=>q.status==='COMPLETED');
    days.push({date,scheduled:daily.length,completed:completed.length,xpEarned:db.xpTransactions.filter(t=>t.date===date).reduce((a,t)=>a+t.amount,0)});
    for(const q of daily){const stat=categoryMap.get(q.category)??{scheduled:0,completed:0};stat.scheduled++;if(q.status==='COMPLETED')stat.completed++;categoryMap.set(q.category,stat);}
  }
  const scheduledCount=days.reduce((a,d)=>a+d.scheduled,0);const completedCount=days.reduce((a,d)=>a+d.completed,0);
  return {days,scheduledCount,completedCount,completionRate:scheduledCount?Math.round(completedCount/scheduledCount*100):0,earnedXp:days.reduce((a,d)=>a+d.xpEarned,0),categories:[...categoryMap].map(([category,values])=>({category:category as AnalyticsDto['categories'][number]['category'],...values}))};
}
function analytics(db:Db,period:'7d'|'30d'):AnalyticsDto {
  const today=todayInTimezone();const length=period==='7d'?7:30;
  const current=periodStats(db,today,length);
  const {days:_previousDays,...previous}=periodStats(db,moveDate(today,-length),length);
  return {period,...current,previous};
}

// ---------- quest mutations ----------
function assertEditableDate(date:string) {
  const today=todayInTimezone();
  if(date>today)throw new ApiError(422,ErrorCode.questInFuture,'Chưa thể hoàn thành nhiệm vụ trong tương lai.');
  if(diffDays(date,today)>MAX_BACKDATE_DAYS)throw new ApiError(422,ErrorCode.questTooOld,'Chỉ có thể điều chỉnh nhiệm vụ trong 7 ngày gần nhất.');
}
async function mutateQuest(habitId:string,date:string,complete:boolean):Promise<QuestMutationDto>{
  await delay(); assertLocalDate(date); const db=load();
  const habit=requireHabit(db,habitId);
  assertEditableDate(date);
  if(!isScheduled(habit,date))throw new ApiError(422,ErrorCode.questOutsideSchedule,'Ngày này không thuộc lịch thực hiện của thói quen.');
  if(!lifecycleActive(db,habit,date))throw new ApiError(409,ErrorCode.questNotActive,'Thói quen hoặc mục tiêu đang tạm dừng vào ngày này.');
  let state=stateOf(db,habitId,date);
  if(!state){state={habitId,date,status:'PENDING',cycle:0,completedAt:null};db.questStates.push(state);}
  const category=db.goals.find(g=>g.id===habit.goalId)!.category;
  let xpAwarded=0;
  if(complete&&state.status==='PENDING'){
    state.status='COMPLETED';state.cycle++;state.completedAt=now();
    xpAwarded=habit.xpReward;
    if(xpAwarded>0)db.xpTransactions.push({id:id(),habitId,date,category,type:'QUEST_COMPLETE',cycle:state.cycle,amount:xpAwarded,createdAt:now()});
  } else if(!complete&&state.status==='COMPLETED'){
    state.status='PENDING';state.completedAt=null;
    // Reverse exactly what this cycle awarded, not the habit's current reward.
    const awarded=db.xpTransactions.find(e=>e.habitId===habitId&&e.date===date&&e.cycle===state.cycle&&e.type==='QUEST_COMPLETE');
    xpAwarded=-(awarded?.amount??0);
    if(awarded)db.xpTransactions.push({id:id(),habitId,date,category,type:'QUEST_REVERT',cycle:state.cycle,amount:xpAwarded,createdAt:now()});
  }
  save(db);const p=progress(db);
  return {habitId,date,status:state.status,xpAwarded,totalXp:p.totalXp,level:p.level,streak:streakForHabit(habit,completedDates(db,habitId),todayInTimezone(),d=>isQuestOn(db,habit,d))};
}

export const mockClient:LifeOsApi={
  async getMe(){await delay();return user;},
  async getDashboard(date=todayInTimezone()):Promise<DailyDashboardDto>{
    await delay();assertLocalDate(date);const db=load();const list=quests(db,date);
    return {date,user,quests:list,progress:progress(db),completedCount:list.filter(q=>q.status==='COMPLETED').length,scheduledCount:list.length,earnedXpToday:db.xpTransactions.filter(e=>e.date===date).reduce((a,e)=>a+e.amount,0),journey:journey(db)};
  },
  async getGoals(){await delay();return load().goals;},
  async createGoal(input:CreateGoalRequest){
    await delay();const fields:Record<string,string>={};
    checkTitle(fields,input.title,'Tên mục tiêu');checkDescription(fields,input.description);
    if(!ALL_CATEGORIES.includes(input.category))fields.category='Lĩnh vực không hợp lệ.';
    if(Object.keys(fields).length)fail(fields);
    const db=load();const goal:GoalDto={id:id(),title:input.title.trim(),category:input.category,description:input.description.trim(),status:'ACTIVE',createdAt:now()};
    db.goals.push(goal);save(db);return goal;
  },
  async updateGoal(goalId,patch){
    await delay();assertOnlyKeys(patch,['title','description','status']);
    const db=load();const goal=db.goals.find(g=>g.id===goalId);if(!goal)throw notFound('mục tiêu');
    const fields:Record<string,string>={};
    if('title' in patch)checkTitle(fields,patch.title,'Tên mục tiêu');
    if('description' in patch)checkDescription(fields,patch.description);
    if('status' in patch)checkStatus(fields,patch.status);
    if(Object.keys(fields).length)fail(fields);
    if(patch.title!==undefined)goal.title=patch.title.trim();
    if(patch.description!==undefined)goal.description=patch.description.trim();
    if(patch.status!==undefined)recordStatus(db,'goals',goal,patch.status);
    save(db);return goal;
  },
  async getHabits(){await delay();return load().habits;},
  async createHabit(input:CreateHabitRequest){
    await delay();const db=load();const fields:Record<string,string>={};
    checkTitle(fields,input.title,'Tên thói quen');
    const goal=db.goals.find(g=>g.id===input.goalId);
    if(!goal)fields.goalId='Không tìm thấy mục tiêu.';else if(goal.status!=='ACTIVE')fields.goalId='Vui lòng chọn mục tiêu đang hoạt động.';
    if(!isInt(input.targetMinutes,1,480))fields.targetMinutes='Thời lượng phải là số nguyên từ 1 đến 480 phút.';
    if(!isInt(input.xpReward,0,100))fields.xpReward='XP thưởng phải là số nguyên từ 0 đến 100.';
    if(!Array.isArray(input.weekdays)||input.weekdays.length===0||!input.weekdays.every(d=>isInt(d,1,7)))fields.weekdays='Chọn ít nhất một ngày trong tuần (1 đến 7).';
    if(!isLocalDate(input.startDate))fields.startDate='Ngày bắt đầu phải có dạng YYYY-MM-DD.';
    else if(input.startDate<todayInTimezone())fields.startDate='Thói quen chỉ có thể bắt đầu từ hôm nay trở đi.';
    if(Object.keys(fields).length)fail(fields);
    const habit:HabitDto={id:id(),title:input.title.trim(),goalId:input.goalId,targetMinutes:input.targetMinutes,xpReward:input.xpReward,weekdays:[...new Set(input.weekdays)].sort((a,b)=>a-b),startDate:input.startDate,endDate:null,status:'ACTIVE'};
    db.habits.push(habit);save(db);return habit;
  },
  async updateHabit(habitId,patch){
    await delay();assertOnlyKeys(patch,['status']);
    const db=load();const habit=requireHabit(db,habitId);
    const fields:Record<string,string>={};checkStatus(fields,patch.status);
    if(Object.keys(fields).length)fail(fields);
    recordStatus(db,'habits',habit,patch.status!);save(db);return habit;
  },
  async getQuests(date){await delay();assertLocalDate(date);return quests(load(),date);},
  completeQuest:(habitId,date)=>mutateQuest(habitId,date,true),
  undoQuest:(habitId,date)=>mutateQuest(habitId,date,false),
  async getProgress(){await delay();return progress(load());},
  async getAnalytics(period){await delay();return analytics(load(),period);},
  async getCurrentJourney(){await delay();return journey(load());}
};
export function resetDemoData(){localStorage.removeItem(DB_KEY);}
export function exportDemoData(){return JSON.stringify(load(),null,2);}
export { categoryLabel };
