import type { LifeOsApi } from './client';
import type { BodyGoalDto, TrainingPlanDto, WorkoutSetDto, WorkoutSetInput, AchievementCode, AchievementDto, AnalyticsDto, AreaStatDto, BossDto, BossMutationDto, ChapterDto, CreateGoalRequest, CreateHabitRequest, DailyDashboardDto, DailyRewardDto, ItemDto, MetricDto, GoalCategory, GoalDto, HabitDto, ImportHabitPlanRequest, ImportedHabitPlanDto, JourneyDto, ProgressDto, QuestDto, QuestMutationDto, RecordStatus, RewardEffectDto, UserDto, Weekday, HabitObjectiveDto, ObjectiveInput, QuestObjectiveDto } from './types';
import { ApiError, ErrorCode } from './errors';
import { ALL_CATEGORIES } from '../domain/insights';
import { DAILY_TIERS, hasChests, rewardThreshold } from '../domain/dailyRewards';
import { ITEM_CATALOG, POOL } from '../domain/items';
import { validateGoalInput } from '../domain/bodyGoal';
import { ACHIEVEMENT_CATALOG, STREAK_TARGET, balancedAchieved, comebackAchieved, spreadAcrossAreas } from '../domain/achievements';
import { BOSS_CATALOG, CHAPTERS } from '../domain/bosses';
import { RECOVERY_DAYS_BY_VARIANT, STANDARD_DAYS_BY_VARIANT, STANDARD_DESCRIPTION, STANDARD_PLAN_MINUTES, STANDARD_PLAN_TITLE, STANDARD_PLAN_XP, standardPlanTemplate, variantFor, variantOfDescription } from '../domain/standardPlan';
import { categoryLabel, diffDays, isScheduled, levelProgress, longestStreakForHabit, moveDate, streakForHabit, todayInTimezone } from '../domain/rules';

const DB_KEY = 'life-os.mock.v1';
const DB_VERSION = 4;
const MAX_BACKDATE_DAYS = 7;
const user: UserDto = { id: 'demo-user-001', displayName: 'Cảnh', email: 'demo@lifeos.local', timezone: 'Asia/Ho_Chi_Minh' };

/** A status change that takes effect on `effectiveDate` (the next local day after the request). */
type LifecycleEvent = { effectiveDate: string; status: RecordStatus };
/** Mutable state of one materialized quest (habit + local date). `cycle` counts completions, as in docs/DATA_MODEL.md. */
type QuestState = { habitId: string; date: string; status: 'PENDING' | 'COMPLETED'; cycle: number; completedAt: string | null; /** the checklist as it was when the quest was created, with progress */ objectives?: QuestObjectiveDto[] };
/** Append-only ledger entry. Never edited or removed. `date` is the quest's local date. */
type XpEvent = { id: string; habitId?: string; bossId?: string; achievementCode?: AchievementCode; dailyKey?: string; date: string; category: GoalCategory; type: 'QUEST_COMPLETE' | 'QUEST_REVERT' | 'BOSS_COMPLETE' | 'BOSS_REVERT' | 'ACHIEVEMENT_GRANT' | 'ACHIEVEMENT_REVOKE' | 'DAILY_REWARD_GRANT' | 'DAILY_REWARD_REVOKE'; cycle: number; amount: number; createdAt: string };
/** Mutable state of one boss. `cycle` counts defeats; `defeatedDate` is the local date of the current defeat. */
type BossState = { bossId: string; status: 'AVAILABLE' | 'DEFEATED'; cycle: number; defeatedDate: string | null; defeatedAt: string | null };
/** Mutable state of one achievement. `cycle` counts grants; `earnedDate` is the local date of the current grant. */
type AchievementState = { code: AchievementCode; status: 'EARNED' | 'LOCKED'; cycle: number; earnedDate: string | null; earnedAt: string | null };
type StoredJourney = Omit<JourneyDto, 'chapters'>;
type Lifecycle = { goals: Record<string, LifecycleEvent[]>; habits: Record<string, LifecycleEvent[]> };
type Db = { version: typeof DB_VERSION; goals: GoalDto[]; habits: HabitDto[]; lifecycle: Lifecycle; questStates: QuestState[]; xpTransactions: XpEvent[]; bossStates: BossState[]; achievementStates: AchievementState[]; journey: StoredJourney; scheduleHistory?: Record<string, { from: string; weekdays: Weekday[] }[]>; rewardSnapshots?: Record<string, number>; items?: { code: string; sourceKey: string; equipped: boolean }[]; metrics?: MetricDto[]; workoutSets?: StoredSet[]; bodyGoal?: BodyGoalDto };

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

/** Same rules and messages as the backend's ObjectiveRules. Errors are keyed `<prefix>objectives[i].field`. */
function checkObjectives(fields: Record<string, string>, raw: unknown, prefix = ''): HabitObjectiveDto[] {
  const out: HabitObjectiveDto[] = [];
  if (raw === undefined || raw === null) return out;
  if (!Array.isArray(raw)) { fields[`${prefix}objectives`] = 'Danh sách mục tiêu không hợp lệ.'; return out; }
  if (raw.length > 20) { fields[`${prefix}objectives`] = 'Tối đa 20 mục tiêu cho một thói quen.'; return out; }
  raw.forEach((item: Partial<ObjectiveInput> | null, i) => {
    const at = `${prefix}objectives[${i}].`;
    if (!item || typeof item !== 'object') { fields[`${prefix}objectives[${i}]`] = 'Mục tiêu không hợp lệ.'; return; }
    let ok = true;
    if (typeof item.title !== 'string' || !item.title.trim()) { fields[`${at}title`] = 'Tên mục tiêu không được để trống.'; ok = false; }
    else if (item.title.trim().length > 100) { fields[`${at}title`] = 'Tên mục tiêu tối đa 100 ký tự.'; ok = false; }
    if (!isInt(item.target, 1, 10000)) { fields[`${at}target`] = 'Mục tiêu phải là số nguyên từ 1 đến 10000.'; ok = false; }
    if (item.unit !== undefined && typeof item.unit !== 'string') { fields[`${at}unit`] = 'Đơn vị không hợp lệ.'; ok = false; }
    else if (typeof item.unit === 'string' && item.unit.trim().length > 20) { fields[`${at}unit`] = 'Đơn vị tối đa 20 ký tự.'; ok = false; }
    if (item.step !== undefined && !(isInt(item.target, 1, 10000) ? isInt(item.step, 1, item.target) : isInt(item.step, 1, 100000))) { fields[`${at}step`] = 'Bước phải là số nguyên từ 1 đến mục tiêu.'; ok = false; }
    if (ok) out.push({ id: id(), title: item.title!.trim(), target: item.target!, unit: (item.unit ?? '').trim(), step: item.step ?? 1 });
  });
  return out;
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
/** The weekly schedule in force on `date`: a habit whose schedule was edited keeps its older versions, so past days never change. */
function scheduledOn(db: Db, habit: HabitDto, date: string): boolean {
  const versions = db.scheduleHistory?.[habit.id];
  if (!versions) return isScheduled(habit, date);
  let weekdays = versions[0].weekdays;
  for (const v of versions) if (v.from <= date) weekdays = v.weekdays;
  return isScheduled({ ...habit, weekdays }, date);
}
/** XP a quest on `date` is worth: the reward frozen when the habit's reward was edited, otherwise the current one. */
function rewardFor(db: Db, habit: HabitDto, date: string): number { return db.rewardSnapshots?.[`${habit.id}|${date}`] ?? habit.xpReward; }
function isQuestOn(db: Db, habit: HabitDto, date: string): boolean {
  return scheduledOn(db, habit, date) && lifecycleActive(db, habit, date);
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
    { id: 'goal-knowledge', title: 'Stay curious', category:'KNOWLEDGE', description:'Đọc và khám phá kiến thức mới mỗi ngày.', status:'ACTIVE', createdAt:now() },
    { id:'goal-mindfulness', title:'Calm mind', category:'MINDFULNESS', description:'Giữ đầu óc tĩnh và tập trung qua thiền và nghỉ không màn hình.', status:'ACTIVE', createdAt:now() }
  ];
  const habits: HabitDto[] = [
    { id:'habit-code', goalId:'goal-career', title:'Deep work · Java & AI', targetMinutes:45, xpReward:50, weekdays:[1,2,3,4,5], startDate:start, endDate:null, status:'ACTIVE', objectives:[] },
    { id:'habit-piano', goalId:'goal-creativity', title:'Practice piano', targetMinutes:30, xpReward:35, weekdays:[1,2,3,4,5,6,7], startDate:start, endDate:null, status:'ACTIVE', objectives:[{ id:'obj-scales', title:'Gam & arpeggio', target:10, unit:'phút', step:5 },{ id:'obj-piece', title:'Bài đang học', target:3, unit:'lần', step:1 },{ id:'obj-record', title:'Ghi âm lại bản chơi', target:1, unit:'', step:1 }] },
    { id:'habit-reading', goalId:'goal-knowledge', title:'Read & reflect', targetMinutes:15, xpReward:20, weekdays:[1,2,3,4,5,6,7], startDate:start, endDate:null, status:'ACTIVE', objectives:[{ id:'obj-pages', title:'Đọc sách', target:20, unit:'trang', step:5 },{ id:'obj-notes', title:'Ghi lại điều học được', target:1, unit:'', step:1 }] },
    { id:'habit-workout', goalId:'goal-health', title:'Move your body', targetMinutes:30, xpReward:40, weekdays:[2,4,6], startDate:start, endDate:null, status:'ACTIVE', objectives:[{ id:'obj-squat', title:'Squat', target:40, unit:'rep', step:5 },{ id:'obj-lunge', title:'Lunge', target:30, unit:'rep', step:5 },{ id:'obj-plank', title:'Plank', target:3, unit:'phút', step:1 }] },
    { id:'habit-meditate', goalId:'goal-mindfulness', title:'Meditate', targetMinutes:10, xpReward:20, weekdays:[1,2,3,4,5,6,7], startDate:start, endDate:null, status:'ACTIVE', objectives:[] }
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
  const db:Db={version:DB_VERSION,goals,habits,lifecycle:{goals:{},habits:{}},questStates,xpTransactions,bossStates:[],achievementStates:[],journey:{id:'journey-66',title:'The 66-Day Reset',startDate:start,durationDays:66,status:'ACTIVE',elapsedDays:21,totalScheduledToDate:0,completedToDate:0}};
  reconcileAchievements(db);
  return db;
}
/** Version 1 stored completions without cycles and kept paused records hidden for all time. */
type DbV2 = Omit<Db, 'version' | 'bossStates' | 'achievementStates'> & { version: 2 };
type DbV3 = Omit<Db, 'version' | 'achievementStates'> & { version: 3 };
type DbV1 = { version: 1; goals: GoalDto[]; habits: HabitDto[]; completions: { habitId: string; date: string; completedAt: string }[]; xpTransactions: { id: string; habitId: string; date: string; type: 'QUEST_COMPLETE' | 'QUEST_REVERT'; amount: number; createdAt: string }[]; journey: StoredJourney };
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
  return { version: DB_VERSION, goals: old.goals, habits: old.habits, lifecycle, questStates, xpTransactions, bossStates: [], achievementStates: [], journey: old.journey };
}
/** Older saved demo data has habits without a checklist. */
function normalize(db:Db):Db{db.habits.forEach(h=>{(h as Partial<HabitDto>).objectives??=[];});return db;}
function load():Db{return normalize(loadRaw());}
function loadRaw():Db {
  try { const stored=localStorage.getItem(DB_KEY); if (stored) {
    const parsed=JSON.parse(stored) as Db | DbV1 | DbV2 | DbV3;
    (parsed as { habits?: Partial<HabitDto>[] }).habits?.forEach(h=>{h.objectives??=[];}); // saved before checklists existed: migrations below read habits too
    if ((parsed.version===2||parsed.version===3) && Array.isArray(parsed.goals) && Array.isArray(parsed.xpTransactions) && Array.isArray(parsed.questStates)) { const migrated:Db={...parsed,version:DB_VERSION,bossStates:(parsed as DbV3).bossStates??[],achievementStates:[]}; reconcileAchievements(migrated); save(migrated); return migrated; }
    if (parsed.version===DB_VERSION && Array.isArray(parsed.goals) && Array.isArray(parsed.xpTransactions) && Array.isArray((parsed as Db).questStates)) return parsed as Db;
    if (parsed.version===1 && Array.isArray(parsed.goals) && Array.isArray(parsed.habits) && Array.isArray(parsed.completions) && Array.isArray(parsed.xpTransactions)) { const migrated=migrateV1(parsed); reconcileAchievements(migrated); save(migrated); return migrated; }
  }} catch { /* damaged demo state resets to sample */ }
  const db=seed(); save(db); return db;
}
function save(db:Db){ localStorage.setItem(DB_KEY,JSON.stringify(db)); }

// ---------- read models ----------
function requireHabit(db:Db,habitId:string){const habit=db.habits.find(h=>h.id===habitId);if(!habit)throw notFound('thói quen');return habit;}
function stateOf(db:Db,habitId:string,date:string){return db.questStates.find(s=>s.habitId===habitId&&s.date===date);}
function completedDates(db:Db,habitId:string){return new Set(db.questStates.filter(s=>s.habitId===habitId&&s.status==='COMPLETED').map(s=>s.date));}
function totalXp(db:Db){return areaStats(db).reduce((sum,a)=>sum+a.xp,0);}
function areaStats(db:Db):AreaStatDto[]{
  return ALL_CATEGORIES.map(category=>{
    const xp=Math.max(0,db.xpTransactions.filter(e=>e.category===category).reduce((sum,e)=>sum+e.amount,0));
    return {category,xp,...levelProgress(xp)};
  });
}
function progress(db:Db,date=todayInTimezone()):ProgressDto {
  const xp=totalXp(db);
  // Paused days are not required sessions, so they neither extend nor break a streak.
  const required=(habit:HabitDto)=>(d:string)=>isQuestOn(db,habit,d);
  const current=db.habits.filter(h=>lifecycleActive(db,h,date)).map(h=>streakForHabit(h,completedDates(db,h.id),date,required(h)));
  const historical=db.habits.map(h=>longestStreakForHabit(h,completedDates(db,h.id),date,required(h)));
  return {totalXp:xp,...levelProgress(xp),areas:areaStats(db), currentStreak:Math.max(0,...current),longestStreak:Math.max(0,...historical)};
}
function quests(db:Db,date:string):QuestDto[]{
  return db.habits.filter(h=>isQuestOn(db,h,date)).map(h=>{
    const goal=db.goals.find(g=>g.id===h.goalId);
    const state=stateOf(db,h.id,date);
    return {habitId:h.id,goalId:h.goalId,goalTitle:goal?.title??'',title:h.title,targetMinutes:h.targetMinutes,xpReward:rewardFor(db,h,date),category:goal?.category??'CAREER',date,status:state?.status??'PENDING',completedAt:state?.completedAt??null,objectives:(state?state.objectives??[]:h.objectives.map(o=>({...o,value:0}))).map(o=>({...o}))};
  });
}
// ---------- daily rewards (chests) and the day streak ----------
function dayCounts(db:Db,date:string){const due=db.habits.filter(h=>isQuestOn(db,h,date));return {scheduled:due.length,completed:due.filter(h=>stateOf(db,h.id,date)?.status==='COMPLETED').length};}
function chestEvents(db:Db,date:string,tier:string,type:'DAILY_REWARD_GRANT'|'DAILY_REWARD_REVOKE'){return db.xpTransactions.filter(e=>e.dailyKey===`${date}:${tier}`&&e.type===type&&e.category===ALL_CATEGORIES[0]).length;}
function chestGranted(db:Db,date:string,tier:string){return chestEvents(db,date,tier,'DAILY_REWARD_GRANT')>chestEvents(db,date,tier,'DAILY_REWARD_REVOKE');}
// Items dropped by chests: a pure function of (day, tier, what is owned), never random; a revoked chest takes its item back.
function hashOf(text:string){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function dropItem(db:Db,date:string,tier:string):string|null{
  db.items??=[];const key=`${date}:${tier}`;const had=db.items.find(i=>i.sourceKey===key);if(had)return had.code;
  const pool=POOL[tier]??[];const candidates=ITEM_CATALOG.filter(i=>pool.includes(i.rarity)&&!db.items!.some(o=>o.code===i.code)).sort((a,b)=>a.code.localeCompare(b.code));
  if(!candidates.length)return null;
  const chosen=candidates[hashOf(`${key}|${candidates.length}`)%candidates.length];db.items.push({code:chosen.code,sourceKey:key,equipped:false});return chosen.code;
}
function revokeItem(db:Db,date:string,tier:string):string|null{
  db.items??=[];const key=`${date}:${tier}`;const at=db.items.findIndex(i=>i.sourceKey===key);if(at<0)return null;
  return db.items.splice(at,1)[0].code;
}
function itemViews(db:Db):ItemDto[]{
  const owned=db.items??[];
  return ITEM_CATALOG.map(c=>{const o=owned.find(x=>x.code===c.code);return {...c,owned:!!o,equipped:!!o?.equipped,acquiredDate:o?o.sourceKey.slice(0,10):null};});
}
// ---------- workout set log (B-34: no XP, no ledger, never completes a quest) ----------
type StoredSet = WorkoutSetDto & { habitId: string; date: string };
const MAX_SETS_PER_QUEST = 300;
const sameExercise = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const setsOfQuest = (db: Db, habitId: string, date: string): WorkoutSetDto[] =>
  (db.workoutSets ?? []).filter(s => s.habitId === habitId && s.date === date).sort((a, b) => a.exercise.localeCompare(b.exercise) || a.setNo - b.setNo).map(({ exercise, setNo, reps, weightKg }) => ({ exercise, setNo, reps, weightKg }));
function requireSetDay(db: Db, habitId: string, date: string): HabitDto {
  assertLocalDate(date);
  const habit = requireHabit(db, habitId);
  const today = todayInTimezone();
  if (date > today) throw new ApiError(422, ErrorCode.questInFuture, 'Chưa thể ghi set cho ngày trong tương lai.');
  if (diffDays(date, today) > MAX_BACKDATE_DAYS) throw new ApiError(422, ErrorCode.questTooOld, 'Chỉ có thể ghi set trong 7 ngày gần nhất.');
  if (!scheduledOn(db, habit, date)) throw new ApiError(422, ErrorCode.questOutsideSchedule, 'Ngày này không thuộc lịch thực hiện của thói quen.');
  return habit;
}

// ---------- body measurements (no XP, no ledger) ----------
const METRIC_DEFAULTS:[string,string][]=[['Cân nặng','kg'],['Vòng eo','cm'],['Mỡ cơ thể','%']];
function ensureMetrics(db:Db):MetricDto[]{
  if(!db.metrics||!db.metrics.length)db.metrics=METRIC_DEFAULTS.map(([name,unit])=>({id:id(),name,unit,builtin:true,entries:[]}));
  return db.metrics;
}
function metricOf(db:Db,metricId:string):MetricDto{const m=ensureMetrics(db).find(x=>x.id===metricId);if(!m)throw notFound('chỉ số');return m;}
function entryDate(date:string,limitBackdate=true):string{
  assertLocalDate(date);const today=todayInTimezone();
  if(date>today)fail({date:'Không thể ghi số đo cho ngày trong tương lai.'});
  if(limitBackdate&&diffDays(date,today)>366)fail({date:'Chỉ ghi được số đo trong 366 ngày gần nhất.'});
  return date;
}
let dailyRewardsEnabled=true;
/** Test seam: suites about other rules switch the chests off to keep exact XP totals; the app always runs with them on. */
export function setDailyRewardsEnabled(on:boolean){dailyRewardsEnabled=on;}
/** Grants chests now reached and revokes chests no longer reached for one day; every change is a ledger event per area. */
function reconcileDaily(db:Db,date:string):RewardEffectDto[]{
  if(!dailyRewardsEnabled)return [];
  const {scheduled,completed}=dayCounts(db,date);const effects:RewardEffectDto[]=[];
  for(const t of DAILY_TIERS){
    const want=hasChests(scheduled)&&completed>=rewardThreshold(scheduled,t.percent);const have=chestGranted(db,date,t.tier);
    if(want===have)continue;
    const cycle=chestEvents(db,date,t.tier,'DAILY_REWARD_GRANT')+(want?1:0);const each=t.xp/ALL_CATEGORIES.length;
    for(const category of ALL_CATEGORIES)db.xpTransactions.push({id:id(),dailyKey:`${date}:${t.tier}`,date,category,type:want?'DAILY_REWARD_GRANT':'DAILY_REWARD_REVOKE',cycle,amount:want?each:-each,createdAt:now()});
    effects.push({type:want?'DAILY_REWARD_GRANTED':'DAILY_REWARD_REVOKED',code:t.tier,xpDelta:want?t.xp:-t.xp});
    const code=want?dropItem(db,date,t.tier):revokeItem(db,date,t.tier);
    if(code)effects.push({type:want?'ITEM_DROPPED':'ITEM_REVOKED',code,xpDelta:0});
  }
  return effects;
}
function dailyRewards(db:Db,date:string):DailyRewardDto[]{
  const {scheduled}=dayCounts(db,date);if(!hasChests(scheduled))return [];
  return DAILY_TIERS.map(t=>({tier:t.tier,threshold:rewardThreshold(scheduled,t.percent),xp:t.xp,state:chestGranted(db,date,t.tier)?'EARNED':'LOCKED',itemCode:(db.items??[]).find(i=>i.sourceKey===`${date}:${t.tier}`)?.code??null}));
}
/** Consecutive days ending today with >= 50% of the scheduled quests done; empty days are skipped, a still-short today does not break it. */
function dayStreak(db:Db,today:string):number{
  const first=db.habits.map(h=>h.startDate).sort()[0]??today;let streak=0;
  for(let d=today;d>=first;d=moveDate(d,-1)){
    const {scheduled,completed}=dayCounts(db,d);if(scheduled===0)continue;
    if(completed>=rewardThreshold(scheduled,DAILY_TIERS[0].percent))streak++;else if(d!==today)break;
  }
  return streak;
}
// ---------- achievements ----------
function sessionsOf(db:Db,habit:HabitDto,today:string):boolean[]{
  const done=completedDates(db,habit.id);const sessions:boolean[]=[];
  for(let d=habit.startDate;d<=today;d=moveDate(d,1)){
    if(!isQuestOn(db,habit,d))continue;
    if(d===today&&!done.has(d))continue; // a pending today is neither a miss nor a win yet
    sessions.push(done.has(d));
  }
  return sessions;
}
/** Whether each achievement's condition holds right now, plus the area credited for STREAK_7 (the habit's own area). */
function achievementConditions(db:Db,today:string):{met:Record<AchievementCode,boolean>;streakCategory:GoalCategory}{
  let streakCategory:GoalCategory='CAREER';let streak=false;let comeback=false;
  for(const habit of db.habits){
    const goal=db.goals.find(g=>g.id===habit.goalId);if(!goal)continue;
    const required=(d:string)=>isQuestOn(db,habit,d);
    if(lifecycleActive(db,habit,today)&&!streak&&streakForHabit(habit,completedDates(db,habit.id),today,required)>=STREAK_TARGET){streak=true;streakCategory=goal.category;}
    if(!comeback&&comebackAchieved(sessionsOf(db,habit,today)))comeback=true;
  }
  return {met:{STREAK_7:streak,BALANCED:balancedAchieved(periodStats(db,today,7).categories),COMEBACK:comeback},streakCategory};
}
/**
 * Grants achievements whose condition now holds and revokes ones that stopped holding while still inside the editable window.
 * Runs inside the same save as the mutation that triggered it; every change is a ledger event.
 */
function reconcileAchievements(db:Db):RewardEffectDto[]{
  const today=todayInTimezone();const {met,streakCategory}=achievementConditions(db,today);const effects:RewardEffectDto[]=[];
  for(const config of ACHIEVEMENT_CATALOG){
    let state=db.achievementStates.find(s=>s.code===config.code);
    if(!state){state={code:config.code,status:'LOCKED',cycle:0,earnedDate:null,earnedAt:null};db.achievementStates.push(state);}
    if(met[config.code]&&state.status==='LOCKED'){
      state.status='EARNED';state.cycle++;state.earnedDate=today;state.earnedAt=now();
      const split=config.code==='BALANCED'?spreadAcrossAreas(config.xpReward).map((amount,i)=>({category:ALL_CATEGORIES[i],amount})):[{category:streakCategory,amount:config.xpReward}];
      for(const part of split)db.xpTransactions.push({id:id(),achievementCode:config.code,date:today,category:part.category,type:'ACHIEVEMENT_GRANT',cycle:state.cycle,amount:part.amount,createdAt:now()});
      effects.push({type:'ACHIEVEMENT_GRANTED',code:config.code,xpDelta:config.xpReward});
    } else if(!met[config.code]&&state.status==='EARNED'&&state.earnedDate&&diffDays(state.earnedDate,today)<=MAX_BACKDATE_DAYS){
      const grants=db.xpTransactions.filter(e=>e.achievementCode===config.code&&e.cycle===state.cycle&&e.type==='ACHIEVEMENT_GRANT');
      for(const g of grants)db.xpTransactions.push({id:id(),achievementCode:config.code,date:g.date,category:g.category,type:'ACHIEVEMENT_REVOKE',cycle:state.cycle,amount:-g.amount,createdAt:now()});
      state.status='LOCKED';state.earnedDate=null;state.earnedAt=null;
      effects.push({type:'ACHIEVEMENT_REVOKED',code:config.code,xpDelta:-grants.reduce((a,g)=>a+g.amount,0)});
    }
  }
  return effects;
}
function achievements(db:Db):AchievementDto[]{
  return ACHIEVEMENT_CATALOG.map(c=>{const s=db.achievementStates.find(x=>x.code===c.code);return {code:c.code,name:c.name,description:c.description,xpReward:c.xpReward,status:s?.status??'LOCKED',earnedAt:s?.earnedAt??null};});
}

function bossStateOf(db:Db,bossId:string){return db.bossStates.find(s=>s.bossId===bossId);}
function chaptersOf(db:Db):ChapterDto[]{
  const areas=areaStats(db);
  return CHAPTERS.map(chapter=>{
    const config=BOSS_CATALOG.find(b=>b.chapter===chapter.index)!;
    const key=bossId(config.code);const state=bossStateOf(db,key);
    const startDate=moveDate(db.journey.startDate,chapter.fromDay-1);const endDate=moveDate(db.journey.startDate,chapter.toDay-1);
    const currentAreaLevel=areas.find(a=>a.category===config.category)!.level;
    const status:BossDto['status']=state?.status==='DEFEATED'?'DEFEATED':currentAreaLevel>=config.requiredLevel?'AVAILABLE':'LOCKED';
    const boss:BossDto={id:key,code:config.code,name:config.name,category:config.category,targetMinutes:config.targetMinutes,xpReward:config.xpReward,tier:config.tier,requiredLevel:config.requiredLevel,currentAreaLevel,artKey:config.artKey,bossDate:endDate,status,defeatedDate:state?.defeatedDate??null,defeatedAt:state?.defeatedAt??null};
    return {index:chapter.index,title:chapter.title,startDate,endDate,boss,badge:{code:`CHAPTER_${chapter.index}`,name:chapter.badgeName,earned:status==='DEFEATED'}};
  });
}
const bossId=(code:string)=>`boss-${code.toLowerCase().replace(/_/g,'-')}`;
function journey(db:Db):JourneyDto {
  const today=todayInTimezone(); const final=moveDate(db.journey.startDate,db.journey.durationDays-1);
  const last=today>final?final:today; const elapsed=Math.max(0,Math.min(db.journey.durationDays,diffDays(db.journey.startDate,today)+1));
  let scheduled=0,completed=0;
  for(let d=db.journey.startDate;d<=last;d=moveDate(d,1)){
    const todays=quests(db,d);scheduled+=todays.length;completed+=todays.filter(q=>q.status==='COMPLETED').length;
  }
  return {...db.journey,elapsedDays:elapsed,totalScheduledToDate:scheduled,completedToDate:completed,chapters:chaptersOf(db)};
}
function periodStats(db:Db,endDate:string,length:number){
  const days:AnalyticsDto['days']=[];const categoryMap=new Map<string,{scheduled:number;completed:number}>();
  for(let offset=length-1;offset>=0;offset--){
    const date=moveDate(endDate,-offset); const daily=quests(db,date);const completed=daily.filter(q=>q.status==='COMPLETED');
    days.push({date,scheduled:daily.length,completed:completed.length,xpEarned:db.xpTransactions.filter(t=>t.date===date).reduce((a,t)=>a+t.amount,0)});
    for(const q of daily){const stat=categoryMap.get(q.category)??{scheduled:0,completed:0};stat.scheduled++;if(q.status==='COMPLETED')stat.completed++;categoryMap.set(q.category,stat);}
    // A boss is scheduled on its bossDate and completed on the date it was defeated (they can differ).
    const today=days[days.length-1];
    for(const boss of chaptersOf(db).map(c=>c.boss)){
      const stat=categoryMap.get(boss.category)??{scheduled:0,completed:0};
      if(boss.bossDate===date){today.scheduled++;stat.scheduled++;}
      if(boss.status==='DEFEATED'&&boss.defeatedDate===date){today.completed++;stat.completed++;}
      categoryMap.set(boss.category,stat);
    }
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
/** Creates the quest's state with a copy of the habit's checklist (like the backend does when a quest is first created). */
function ensureState(db:Db,habit:HabitDto,date:string):QuestState{
  let state=stateOf(db,habit.id,date);
  if(!state){state={habitId:habit.id,date,status:'PENDING',cycle:0,completedAt:null,objectives:habit.objectives.map(o=>({...o,value:0}))};db.questStates.push(state);}
  return state;
}
/** Before the habit's checklist changes, every lived day in the 7-day window that has no state yet gets one that keeps the old checklist. */
function freezeLivedDays(db:Db,habit:HabitDto){
  const today=todayInTimezone();
  for(let d=moveDate(today,-7);d<=today;d=moveDate(d,1))if(isQuestOn(db,habit,d))ensureState(db,habit,d);
}
async function mutateQuest(habitId:string,date:string,complete:boolean|null,objectiveId?:string,value?:unknown):Promise<QuestMutationDto>{
  await delay(); assertLocalDate(date);
  if(objectiveId!==undefined&&!isInt(value,0,100000))fail({value:'Tiến độ phải là số nguyên từ 0 đến 100000.'});
  const db=load();
  const habit=requireHabit(db,habitId);
  assertEditableDate(date);
  if(!scheduledOn(db,habit,date))throw new ApiError(422,ErrorCode.questOutsideSchedule,'Ngày này không thuộc lịch thực hiện của thói quen.');
  if(!lifecycleActive(db,habit,date))throw new ApiError(409,ErrorCode.questNotActive,'Thói quen hoặc mục tiêu đang tạm dừng vào ngày này.');
  const state=ensureState(db,habit,date);
  const checklist=state.objectives??[];
  let target:boolean;
  if(objectiveId===undefined){
    target=complete as boolean;
    // Undo only empties the lines of a quest that is actually done; on a pending one it keeps partial progress.
    if(target||state.status==='COMPLETED')for(const o of checklist)o.value=target?Math.max(o.value,o.target):0;
  } else {
    const line=checklist.find(o=>o.id===objectiveId);
    if(!line)throw notFound('mục tiêu');
    line.value=value as number;
    target=checklist.every(o=>o.value>=o.target);
  }
  const category=db.goals.find(g=>g.id===habit.goalId)!.category;
  let xpAwarded=0;let changed=false;
  if(target&&state.status==='PENDING'){
    changed=true;state.status='COMPLETED';state.cycle++;state.completedAt=now();
    xpAwarded=rewardFor(db,habit,date);
    if(xpAwarded>0)db.xpTransactions.push({id:id(),habitId,date,category,type:'QUEST_COMPLETE',cycle:state.cycle,amount:xpAwarded,createdAt:now()});
  } else if(!target&&state.status==='COMPLETED'){
    changed=true;state.status='PENDING';state.completedAt=null;
    // Reverse exactly what this cycle awarded, not the habit's current reward.
    const awarded=db.xpTransactions.find(e=>e.habitId===habitId&&e.date===date&&e.cycle===state.cycle&&e.type==='QUEST_COMPLETE');
    xpAwarded=-(awarded?.amount??0);
    if(awarded)db.xpTransactions.push({id:id(),habitId,date,category,type:'QUEST_REVERT',cycle:state.cycle,amount:xpAwarded,createdAt:now()});
  }
  const effects=changed?[...reconcileDaily(db,date),...reconcileAchievements(db)]:[];xpAwarded+=effects.reduce((a,e)=>a+e.xpDelta,0);
  save(db);const p=progress(db);
  return {habitId,date,status:state.status,xpAwarded,effects,totalXp:p.totalXp,level:p.level,streak:streakForHabit(habit,completedDates(db,habitId),todayInTimezone(),d=>isQuestOn(db,habit,d)),objectives:checklist.map(o=>({...o}))};
}
async function mutateBoss(target:string,defeat:boolean):Promise<BossMutationDto>{
  await delay();const db=load();
  const boss=chaptersOf(db).map(c=>c.boss).find(b=>b.id===target);
  if(!boss)throw notFound('boss');
  const today=todayInTimezone();
  let state=bossStateOf(db,target);
  if(!state){state={bossId:target,status:'AVAILABLE',cycle:0,defeatedDate:null,defeatedAt:null};db.bossStates.push(state);}
  let xpAwarded=0;let changed=false;
  if(defeat&&state.status!=='DEFEATED'){
    if(boss.status==='LOCKED')throw new ApiError(409,ErrorCode.bossLocked,`Boss chưa mở khóa: cần ${boss.requiredLevel} level ở lĩnh vực ${categoryLabel(boss.category)}.`);
    changed=true;state.status='DEFEATED';state.cycle++;state.defeatedDate=today;state.defeatedAt=now();
    xpAwarded=boss.xpReward;
    db.xpTransactions.push({id:id(),bossId:target,date:today,category:boss.category,type:'BOSS_COMPLETE',cycle:state.cycle,amount:xpAwarded,createdAt:now()});
  } else if(!defeat&&state.status==='DEFEATED'){
    assertEditableDate(state.defeatedDate!);
    const awarded=db.xpTransactions.find(e=>e.bossId===target&&e.cycle===state.cycle&&e.type==='BOSS_COMPLETE');
    xpAwarded=-(awarded?.amount??0);
    if(awarded)db.xpTransactions.push({id:id(),bossId:target,date:awarded.date,category:boss.category,type:'BOSS_REVERT',cycle:state.cycle,amount:xpAwarded,createdAt:now()});
    changed=true;state.status='AVAILABLE';state.defeatedDate=null;state.defeatedAt=null;
  }
  const effects=changed?reconcileAchievements(db):[];xpAwarded+=effects.reduce((a,e)=>a+e.xpDelta,0);
  save(db);const p=progress(db);
  const status=chaptersOf(db).map(c=>c.boss).find(b=>b.id===target)!.status;
  return {bossId:target,status,xpAwarded,totalXp:p.totalXp,level:p.level,effects};
}

const findPlanGoal=(db:Db)=>db.goals.find(g=>g.status==='ACTIVE'&&g.title.trim().toLowerCase()===STANDARD_PLAN_TITLE.toLowerCase());
function planOf(db:Db):TrainingPlanDto{
  const suggested=variantFor(db.bodyGoal);const goal=findPlanGoal(db);if(!goal)return standardPlanTemplate(suggested);
  const sessions=db.habits.filter(h=>h.goalId===goal.id&&h.status==='ACTIVE').sort((a,b)=>(a.weekdays[0]??9)-(b.weekdays[0]??9)||a.title.localeCompare(b.title))
    .map(h=>({habitId:h.id,title:h.title,targetMinutes:h.targetMinutes,xpReward:h.xpReward,weekdays:[...h.weekdays],objectives:h.objectives.map(o=>({title:o.title,target:o.target,unit:o.unit,step:o.step}))}));
  return {started:true,goalId:goal.id,title:goal.title,description:goal.description,sessions,variant:variantOfDescription(goal.description),suggestedVariant:suggested};
}
export const mockClient:LifeOsApi={
  async getMe(){await delay();return user;},
  async register(){await delay();return user;},
  async login(){await delay();return user;},
  async logout(){await delay();},
  async getDashboard(date=todayInTimezone()):Promise<DailyDashboardDto>{
    await delay();assertLocalDate(date);const db=load();const list=quests(db,date);
    return {date,user,quests:list,progress:progress(db),completedCount:list.filter(q=>q.status==='COMPLETED').length,scheduledCount:list.length,earnedXpToday:db.xpTransactions.filter(e=>e.date===date).reduce((a,e)=>a+e.amount,0),journey:journey(db),dailyRewards:dailyRewards(db,date),dayStreak:dayStreak(db,todayInTimezone())};
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
    const checklist=checkObjectives(fields,input.objectives);
    if(!isLocalDate(input.startDate))fields.startDate='Ngày bắt đầu phải có dạng YYYY-MM-DD.';
    else if(input.startDate<todayInTimezone())fields.startDate='Thói quen chỉ có thể bắt đầu từ hôm nay trở đi.';
    if(Object.keys(fields).length)fail(fields);
    const habit:HabitDto={id:id(),title:input.title.trim(),goalId:input.goalId,targetMinutes:input.targetMinutes,xpReward:input.xpReward,weekdays:[...new Set(input.weekdays)].sort((a,b)=>a-b),startDate:input.startDate,endDate:null,status:'ACTIVE',objectives:checklist};
    db.habits.push(habit);save(db);return habit;
  },
  async importHabitPlan(input:ImportHabitPlanRequest):Promise<ImportedHabitPlanDto>{
    await delay();const db=load();const plan=input?.goals;
    if(!Array.isArray(plan)||plan.length===0)fail({goals:'Cần ít nhất một mục tiêu.'});
    if(plan.length>10)fail({goals:'Tối đa 10 mục tiêu mỗi lần nhập.'});
    if(plan.some(g=>!g||typeof g!=='object'))fail({goals:'Mục tiêu không hợp lệ.'});
    if(plan.reduce((n,g)=>n+(Array.isArray(g.habits)?g.habits.length:0),0)>50)fail({goals:'Tối đa 50 thói quen mỗi lần nhập.'});
    const key=(t:string)=>t.trim().toLowerCase();const taken=new Set(db.goals.filter(g=>g.status==='ACTIVE').map(g=>key(g.title)));
    for(const g of plan){
      if(typeof g.title!=='string'||!g.title.trim())continue;
      if(taken.has(key(g.title)))throw new ApiError(409,ErrorCode.planAlreadyImported,`Mục tiêu "${g.title.trim()}" đã tồn tại; kế hoạch này có thể đã được nhập.`);
      taken.add(key(g.title));
    }
    const errors:Record<string,string>={};const goals:GoalDto[]=[];const habits:HabitDto[]=[];
    const put=(prefix:string,f:Record<string,string>)=>{for(const [k,v] of Object.entries(f))errors[k==='startDate'?k:prefix+k]??=v;};
    plan.forEach((g,i)=>{
      const gp=`goals[${i}].`;const gf:Record<string,string>={};
      checkTitle(gf,g.title,'Tên mục tiêu');checkDescription(gf,g.description);
      if(!ALL_CATEGORIES.includes(g.category))gf.category='Lĩnh vực không hợp lệ.';
      const noHabits=!Array.isArray(g.habits)||g.habits.length===0;
      if(noHabits)gf.habits='Cần ít nhất một thói quen.';
      put(gp,gf);if(Object.keys(gf).length)return;
      const goal:GoalDto={id:id(),title:g.title.trim(),category:g.category,description:g.description.trim(),status:'ACTIVE',createdAt:now()};goals.push(goal);
      g.habits.forEach((h,j)=>{
        const hp=`${gp}habits[${j}].`;const hf:Record<string,string>={};
        if(!h||typeof h!=='object'){errors[`${gp}habits[${j}]`]??='Thói quen không hợp lệ.';return;}
        checkTitle(hf,h.title,'Tên thói quen');
        if(!isInt(h.targetMinutes,1,480))hf.targetMinutes='Thời lượng phải là số nguyên từ 1 đến 480 phút.';
        if(!isInt(h.xpReward,0,100))hf.xpReward='XP thưởng phải là số nguyên từ 0 đến 100.';
        if(!Array.isArray(h.weekdays)||h.weekdays.length===0||!h.weekdays.every(d=>isInt(d,1,7)))hf.weekdays='Chọn ít nhất một ngày trong tuần (1 đến 7).';
        if(!isLocalDate(input.startDate))hf.startDate='Ngày bắt đầu phải có dạng YYYY-MM-DD.';
        else if(input.startDate<todayInTimezone())hf.startDate='Thói quen chỉ có thể bắt đầu từ hôm nay trở đi.';
        const parsed=checkObjectives(hf,h.objectives);
        put(hp,hf);if(Object.keys(hf).length)return;
        habits.push({id:id(),title:h.title.trim(),goalId:goal.id,targetMinutes:h.targetMinutes,xpReward:h.xpReward,weekdays:[...new Set(h.weekdays)].sort((a,b)=>a-b),startDate:input.startDate,endDate:null,status:'ACTIVE',objectives:parsed});
      });
    });
    if(Object.keys(errors).length)fail(errors);
    db.goals.push(...goals);db.habits.push(...habits);save(db);return {goals,habits};
  },
  async getBodyGoal(){await delay();const g=load().bodyGoal;if(!g)throw notFound('mục tiêu cơ thể');return g;},
  async saveBodyGoal(input){
    await delay();const fields=validateGoalInput(input);
    if(typeof input.startDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)||Number.isNaN(Date.parse(input.startDate)))fields.startDate='Ngày bắt đầu có dạng YYYY-MM-DD.';
    if(Object.keys(fields).length)throw new ApiError(422,ErrorCode.validation,Object.values(fields)[0]!,fields);
    const db=load();db.bodyGoal={heightCm:input.heightCm,startWeightKg:input.startWeightKg,targetWeightKg:input.targetWeightKg,startDate:input.startDate,days:input.days};save(db);return db.bodyGoal;
  },
  async getPlan():Promise<TrainingPlanDto>{
    await delay();return planOf(load());
  },
  async startPlan(startDate:string):Promise<TrainingPlanDto>{
    // One plan per account: an ACTIVE goal with the standard title. Starting it again returns it and creates nothing.
    const db=load();if(!findPlanGoal(db)){
      const variant=variantFor(db.bodyGoal);
      await mockClient.importHabitPlan({startDate,goals:[{title:STANDARD_PLAN_TITLE,category:'HEALTH',description:STANDARD_DESCRIPTION[variant],
        habits:[...STANDARD_DAYS_BY_VARIANT[variant].map(d=>({title:d.title,targetMinutes:STANDARD_PLAN_MINUTES,xpReward:STANDARD_PLAN_XP,weekdays:[...d.weekdays] as Weekday[],objectives:d.lines.map(l=>({...l}))})),
          ...RECOVERY_DAYS_BY_VARIANT[variant].map(d=>({title:d.title,targetMinutes:d.targetMinutes,xpReward:d.xpReward,weekdays:[...d.weekdays] as Weekday[],objectives:d.lines.map(l=>({...l}))}))]}]});
    }
    return planOf(load());
  },
  async addRecoveryDays(startDate:string):Promise<TrainingPlanDto>{
    // Adds only the sessions the plan lacks, from startDate on, so no lived day changes. Without a plan there is nothing to add to.
    if(!isLocalDate(startDate))fail({startDate:'Ngày bắt đầu phải có dạng YYYY-MM-DD.'});
    const db0=load();const goal=findPlanGoal(db0);
    if(!goal)throw new ApiError(409,ErrorCode.planNotStarted,'Chưa có giáo án; hãy bắt đầu giáo án trước.');
    const variant=variantOfDescription(goal.description)??'GENTLE';
    const have=new Set(db0.habits.filter(h=>h.goalId===goal.id&&h.status==='ACTIVE').map(h=>h.title.trim().toLowerCase()));
    for(const d of RECOVERY_DAYS_BY_VARIANT[variant]){
      if(have.has(d.title.toLowerCase()))continue;
      await mockClient.createHabit({goalId:goal.id,title:d.title,targetMinutes:d.targetMinutes,xpReward:d.xpReward,weekdays:[...d.weekdays] as Weekday[],startDate,objectives:d.lines.map(l=>({...l}))});
    }
    return planOf(load());
  },
  async updateHabit(habitId,patch){
    await delay();assertOnlyKeys(patch,['status','title','targetMinutes','xpReward','weekdays','endDate','objectives']);
    const db=load();const habit=requireHabit(db,habitId);const today=todayInTimezone();
    const p=patch as Record<string,unknown>;const fields:Record<string,string>={};
    if(habit.status==='ARCHIVED')fields.patch='Thói quen đã lưu trữ nên không thể chỉnh sửa.';
    if('title' in p)checkTitle(fields,p.title,'Tên thói quen');
    if('targetMinutes' in p&&!isInt(p.targetMinutes,1,480))fields.targetMinutes='Thời lượng phải là số nguyên từ 1 đến 480 phút.';
    if('xpReward' in p&&!isInt(p.xpReward,0,100))fields.xpReward='XP thưởng phải là số nguyên từ 0 đến 100.';
    if('weekdays' in p&&(!Array.isArray(p.weekdays)||p.weekdays.length===0||!p.weekdays.every(d=>isInt(d,1,7))))fields.weekdays='Chọn ít nhất một ngày trong tuần (1 đến 7).';
    if('status' in p)checkStatus(fields,p.status);
    const checklist='objectives' in p?checkObjectives(fields,p.objectives):null;
    if('endDate' in p){
      if(habit.endDate&&habit.endDate<today)fields.endDate='Thói quen đã kết thúc nên không thể đổi ngày kết thúc.';
      else if(p.endDate!==null){
        if(!isLocalDate(p.endDate))fields.endDate='Ngày kết thúc phải có dạng YYYY-MM-DD.';
        else if(p.endDate<today)fields.endDate='Ngày kết thúc không được ở quá khứ.';
        else if(p.endDate<habit.startDate)fields.endDate='Ngày kết thúc phải sau ngày bắt đầu.';
      }
    }
    if(Object.keys(fields).length)fail(fields);
    const sameList=(a:HabitObjectiveDto[],b:HabitObjectiveDto[])=>a.length===b.length&&a.every((o,i)=>o.title===b[i].title&&o.target===b[i].target&&o.unit===b[i].unit&&o.step===b[i].step);
    if(checklist&&!sameList(habit.objectives,checklist)){freezeLivedDays(db,habit);habit.objectives=checklist;} // lived days keep their copy; the new list starts tomorrow
    if('title' in p)habit.title=(p.title as string).trim();
    if('targetMinutes' in p)habit.targetMinutes=p.targetMinutes as number;
    if('xpReward' in p&&p.xpReward!==habit.xpReward){
      // Lived days inside the edit window keep what they were worth; only later days get the new reward.
      const snaps=db.rewardSnapshots??(db.rewardSnapshots={});
      for(let d=moveDate(today,-7);d<=today;d=moveDate(d,1))if(isQuestOn(db,habit,d)&&snaps[`${habit.id}|${d}`]===undefined)snaps[`${habit.id}|${d}`]=habit.xpReward;
      habit.xpReward=p.xpReward as number;
    }
    if('endDate' in p)habit.endDate=p.endDate as string|null;
    if('weekdays' in p){
      const days=[...new Set(p.weekdays as Weekday[])].sort((a,b)=>a-b);
      const history=db.scheduleHistory??(db.scheduleHistory={});
      const versions=history[habit.id]??(history[habit.id]=[{from:habit.startDate,weekdays:[...habit.weekdays]}]);
      if(versions[versions.length-1].weekdays.join()!==days.join()){
        const tomorrow=moveDate(today,1);const from=tomorrow<habit.startDate?habit.startDate:tomorrow; // starts tomorrow (or at the start date); a second change today replaces the first
        const same=versions.findIndex(v=>v.from===from);if(same>=0)versions.splice(same,1);
        versions.push({from,weekdays:days});versions.sort((a,b)=>a.from.localeCompare(b.from));
      }
      habit.weekdays=days;
    }
    if('status' in p)recordStatus(db,'habits',habit,p.status as RecordStatus);
    save(db);return habit;
  },
  async getQuests(date){await delay();assertLocalDate(date);return quests(load(),date);},
  completeQuest:(habitId,date)=>mutateQuest(habitId,date,true),
  undoQuest:(habitId,date)=>mutateQuest(habitId,date,false),
  setObjective:(habitId,date,objectiveId,value)=>mutateQuest(habitId,date,null,objectiveId,value),
  defeatBoss:bossId=>mutateBoss(bossId,true),
  undoBoss:bossId=>mutateBoss(bossId,false),
  async getAchievements(){await delay();return achievements(load());},
  async getItems(){await delay();return itemViews(load());},
  async getMetrics(){await delay();const db=load();const list=ensureMetrics(db);save(db);return structuredClone(list);},
  async createMetric(input:{name:string;unit:string}){
    await delay();const db=load();const list=ensureMetrics(db);const name=(input.name??'').trim();const unit=(input.unit??'').trim();const fields:Record<string,string>={};
    if(!name||name.length>40)fields.name='Tên chỉ số từ 1 đến 40 ký tự.';else if(list.some(m=>m.name.toLowerCase()===name.toLowerCase()))fields.name='Đã có chỉ số tên này.';
    if(unit.length>12)fields.unit='Đơn vị tối đa 12 ký tự.';
    if(Object.keys(fields).length)fail(fields);
    if(list.length>=20)throw new ApiError(422,'TOO_MANY_METRICS','Tối đa 20 chỉ số.');
    const metric:MetricDto={id:id(),name,unit,builtin:false,entries:[]};list.push(metric);save(db);return structuredClone(metric);
  },
  async getWorkoutSets(habitId:string,date:string){
    await delay();assertLocalDate(date);const db=load();requireHabit(db,habitId);return setsOfQuest(db,habitId,date);
  },
  async recordWorkoutSet(habitId:string,date:string,input:WorkoutSetInput){
    await delay();const db=load();requireSetDay(db,habitId,date);
    const fields:Record<string,string>={};const exercise=typeof input?.exercise==='string'?input.exercise.trim():'';
    if(!exercise||exercise.length>100)fields.exercise='Tên bài tập từ 1 đến 100 ký tự.';
    if(!isInt(input?.setNo,1,50))fields.setNo='Số set phải là số nguyên từ 1 đến 50.';
    if(!isInt(input?.reps,1,1000))fields.reps='Số rep phải là số nguyên từ 1 đến 1000.';
    const w=input?.weightKg;let weight:number|null=null;
    if(w!==undefined&&w!==null){if(typeof w!=='number'||!Number.isFinite(w))fields.weightKg='Mức tạ phải là một số.';else{weight=Math.round(w*100)/100;if(weight<0||weight>1000)fields.weightKg='Mức tạ từ 0 đến 1000 kg.';}}
    if(Object.keys(fields).length)fail(fields);
    const list=db.workoutSets??(db.workoutSets=[]);
    const at=list.find(s=>s.habitId===habitId&&s.date===date&&sameExercise(s.exercise,exercise)&&s.setNo===input.setNo);
    if(at){at.reps=input.reps;at.weightKg=weight;}
    else{
      if(list.filter(s=>s.habitId===habitId&&s.date===date).length>=MAX_SETS_PER_QUEST)throw new ApiError(422,'TOO_MANY_SETS',`Tối đa ${MAX_SETS_PER_QUEST} set cho một buổi tập.`);
      list.push({habitId,date,exercise,setNo:input.setNo,reps:input.reps,weightKg:weight});
    }
    save(db);return setsOfQuest(db,habitId,date);
  },
  async removeWorkoutSet(habitId:string,date:string,exercise:string,setNo:number){
    await delay();const db=load();requireSetDay(db,habitId,date);
    db.workoutSets=(db.workoutSets??[]).filter(s=>!(s.habitId===habitId&&s.date===date&&sameExercise(s.exercise,exercise)&&s.setNo===setNo));
    save(db);return setsOfQuest(db,habitId,date);
  },
  async getLastWorkoutSets(exercise:string,before:string){
    await delay();assertLocalDate(before);const name=(exercise??'').trim();
    if(!name||name.length>100)fail({exercise:'Tên bài tập từ 1 đến 100 ký tự.'});
    const db=load();const days=(db.workoutSets??[]).filter(s=>sameExercise(s.exercise,name)&&s.date<before).map(s=>s.date);
    if(!days.length)return {date:null,sets:[]};
    const date=days.sort().at(-1)!;
    const sets=(db.workoutSets??[]).filter(s=>sameExercise(s.exercise,name)&&s.date===date).sort((a,b)=>a.habitId.localeCompare(b.habitId)||a.setNo-b.setNo).map(({exercise:e,setNo,reps,weightKg})=>({exercise:e,setNo,reps,weightKg}));
    return {date,sets};
  },
  async getBadges(){
    await delay();const db=load();
    const sessions=db.questStates.filter(q=>q.status==='COMPLETED'&&((q.objectives?.length??db.habits.find(h=>h.id===q.habitId)?.objectives.length??0)>0)).length;
    const sets=(db.workoutSets??[]).length;
    const defs:[string,string,string,number,number][]=[
      ['BADGE_FIRST_WORKOUT','Buổi tập đầu tiên','Hoàn thành một buổi tập có danh sách bài.',1,sessions],
      ['BADGE_10_SESSIONS','Mười buổi tập','Hoàn thành 10 buổi tập có danh sách bài.',10,sessions],
      ['BADGE_100_SETS','Trăm set','Ghi lại 100 set trong nhật ký tập.',100,sets]];
    return defs.map(([code,name,description,target,have])=>({code,name,description,earned:have>=target,progress:Math.min(have,target),target}));
  },
  async getWorkoutStats(days:number){
    await delay();if(!isInt(days,1,90))fail({days:'Số ngày phải từ 1 đến 90.'});
    const db=load();const to=todayInTimezone(),from=moveDate(to,-(days-1));
    const sets=(db.workoutSets??[]).filter(s=>s.date>=from&&s.date<=to);
    const perDay=Array.from({length:days},(_,i)=>{const date=moveDate(from,i);return {date,sets:sets.filter(s=>s.date===date).length};});
    const sessions=new Set(sets.map(s=>`${s.habitId}|${s.date}`)).size;
    const by=new Map<string,{exercise:string;sets:number;reps:number;volumeKg:number}>();
    for(const s of sets){const k=s.exercise.toLowerCase();const cur=by.get(k)??{exercise:s.exercise,sets:0,reps:0,volumeKg:0};cur.sets++;cur.reps+=s.reps;cur.volumeKg=Math.round((cur.volumeKg+(s.weightKg?s.reps*s.weightKg:0))*100)/100;by.set(k,cur);}
    const exercises=[...by.values()].sort((a,b)=>b.volumeKg-a.volumeKg||b.sets-a.sets||a.exercise.localeCompare(b.exercise));
    return {from,to,sessions,days:perDay,exercises};
  },
  async recordMeasurement(metricId:string,date:string,value:number){
    await delay();const db=load();const metric=metricOf(db,metricId);const d=entryDate(date);
    const v=typeof value==='number'&&Number.isFinite(value)?Math.round(value*100)/100:NaN;
    if(!(v>0)||v>100000)fail({value:typeof value==='number'?'Giá trị phải lớn hơn 0 và không quá 100000.':'Giá trị phải là một số.'});
    const at=metric.entries.findIndex(e=>e.date===d);if(at>=0)metric.entries[at].value=v;else metric.entries.push({date:d,value:v});
    metric.entries.sort((a,b)=>a.date.localeCompare(b.date));save(db);return structuredClone(metric);
  },
  async removeMeasurement(metricId:string,date:string){
    await delay();const db=load();const metric=metricOf(db,metricId);const d=entryDate(date,false);
    metric.entries=metric.entries.filter(e=>e.date!==d);save(db);return structuredClone(metric);
  },
  async deleteMetric(metricId:string){
    await delay();const db=load();const metric=metricOf(db,metricId);
    if(metric.builtin)throw new ApiError(409,'METRIC_BUILTIN','Không xoá được chỉ số mặc định.');
    db.metrics=ensureMetrics(db).filter(m=>m.id!==metricId);save(db);
  },
  async equipItem(code:string){
    await delay();const db=load();db.items??=[];const mine=db.items.find(i=>i.code===code);if(!mine)throw notFound('vật phẩm');
    const slot=ITEM_CATALOG.find(c=>c.code===code)?.slot;if(!slot)throw notFound('vật phẩm');
    for(const other of db.items)if(ITEM_CATALOG.find(c=>c.code===other.code)?.slot===slot)other.equipped=false;
    mine.equipped=true;save(db);return itemViews(db).find(i=>i.code===code)!;
  },
  async unequipItem(code:string){
    await delay();const db=load();db.items??=[];const mine=db.items.find(i=>i.code===code);if(!mine)throw notFound('vật phẩm');
    mine.equipped=false;save(db);return itemViews(db).find(i=>i.code===code)!;
  },
  async getProgress(){await delay();return progress(load());},
  async getAnalytics(period){await delay();return analytics(load(),period);},
  async getCurrentJourney(){await delay();return journey(load());}
};
export function resetDemoData(){localStorage.removeItem(DB_KEY);}
export function exportDemoData(){return JSON.stringify(load(),null,2);}
export { categoryLabel };
