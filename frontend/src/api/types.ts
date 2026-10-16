/** Public DTO contract. See docs/API_CONTRACT.md. Dates: YYYY-MM-DD (user timezone). Instants: UTC ISO 8601. */
export type GoalCategory = 'CAREER' | 'CREATIVITY' | 'HEALTH' | 'KNOWLEDGE' | 'MINDFULNESS';
export type RecordStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type QuestStatus = 'PENDING' | 'COMPLETED' | 'SKIPPED';
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export interface UserDto { id: string; displayName: string; email: string; timezone: string; }
export interface RegisterRequest { email: string; password: string; displayName: string; timezone?: string; }
export interface LoginRequest { email: string; password: string; }
export interface GoalDto { id: string; title: string; category: GoalCategory; description: string; status: RecordStatus; createdAt: string; }
/** One line of a habit's checklist: "Squat 40 rep", "Nước 10 cốc". `target` 1 with no unit is a plain tick. `step` is the +/- button size. */
export interface HabitObjectiveDto { id: string; title: string; target: number; unit: string; step: number; }
/** The same line on a given day, with the progress made. A quest completes when every line has `value >= target`. */
export interface QuestObjectiveDto extends HabitObjectiveDto { value: number; }
export interface ObjectiveInput { title: string; target: number; unit?: string; step?: number; }
export interface HabitDto { id: string; goalId: string; title: string; targetMinutes: number; xpReward: number; weekdays: Weekday[]; startDate: string; endDate: string | null; status: RecordStatus; objectives: HabitObjectiveDto[]; }
export interface QuestDto { habitId: string; goalId: string; goalTitle: string; title: string; targetMinutes: number; xpReward: number; category: GoalCategory; date: string; status: QuestStatus; completedAt: string | null; objectives: QuestObjectiveDto[]; }
export interface AreaStatDto { category: GoalCategory; xp: number; level: number; levelStartXp: number; nextLevelXp: number; }
export interface ProgressDto { totalXp: number; level: number; levelStartXp: number; nextLevelXp: number; currentStreak: number; longestStreak: number; areas: AreaStatDto[]; }
export interface DailyDashboardDto { date: string; user: UserDto; quests: QuestDto[]; progress: ProgressDto; completedCount: number; scheduledCount: number; earnedXpToday: number; journey: JourneyDto | null; }
export type BossStatus = 'LOCKED' | 'AVAILABLE' | 'DEFEATED';
export type BossTier = 1 | 2 | 3 | 4 | 5;
export interface BossDto { id: string; code: string; name: string; category: GoalCategory; targetMinutes: number; xpReward: number; tier: BossTier; requiredLevel: number; currentAreaLevel: number; artKey: string; bossDate: string; status: BossStatus; defeatedDate: string | null; defeatedAt: string | null; }
/** Cosmetic reward for a chapter; earned exactly while its boss is DEFEATED. Carries no XP (the boss reward does). */
export interface ChapterBadgeDto { code: string; name: string; earned: boolean; }
export interface ChapterDto { index: number; title: string; startDate: string; endDate: string; boss: BossDto; badge: ChapterBadgeDto; }
export interface JourneyDto { id: string; title: string; startDate: string; durationDays: number; elapsedDays: number; totalScheduledToDate: number; completedToDate: number; status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'; chapters: ChapterDto[]; }
export type AchievementCode = 'STREAK_7' | 'BALANCED' | 'COMEBACK';
export interface AchievementDto { code: AchievementCode; name: string; description: string; xpReward: number; status: 'LOCKED' | 'EARNED'; earnedAt: string | null; }
export type RewardEffectType = 'BOSS_REVERTED' | 'ACHIEVEMENT_GRANTED' | 'ACHIEVEMENT_REVOKED';
export interface RewardEffectDto { type: RewardEffectType; code: string; xpDelta: number; }
export interface DayStatDto { date: string; scheduled: number; completed: number; xpEarned: number; }
export interface CategoryStatDto { category: GoalCategory; scheduled: number; completed: number; }
export interface PreviousPeriodDto { completionRate: number; completedCount: number; scheduledCount: number; earnedXp: number; categories: CategoryStatDto[]; }
/** `previous` (same-length preceding period) is optional until the radar chart is implemented; then it becomes required. */
export interface AnalyticsDto { period: '7d' | '30d'; days: DayStatDto[]; completionRate: number; completedCount: number; scheduledCount: number; earnedXp: number; categories: CategoryStatDto[]; previous?: PreviousPeriodDto; }
/** `xpAwarded` is the net XP delta of the whole request, including `effects`. `effects` lists achievements granted or revoked by the request. */
export interface QuestMutationDto { habitId: string; date: string; status: 'PENDING' | 'COMPLETED'; xpAwarded: number; totalXp: number; level: number; streak: number; effects: RewardEffectDto[]; objectives: QuestObjectiveDto[]; }
export interface BossMutationDto { bossId: string; status: BossStatus; xpAwarded: number; totalXp: number; level: number; effects: RewardEffectDto[]; }
export interface CreateGoalRequest { title: string; category: GoalCategory; description: string; }
/** Any subset of these. `weekdays` and `status` apply from the next local day; an ARCHIVED habit is final. */
export type PatchHabit = Partial<Pick<HabitDto, 'title' | 'targetMinutes' | 'xpReward' | 'weekdays' | 'endDate' | 'status'>> & { objectives?: ObjectiveInput[] };
export interface CreateHabitRequest { title: string; goalId: string; targetMinutes: number; xpReward: number; weekdays: Weekday[]; startDate: string; objectives?: ObjectiveInput[]; }
export interface ImportHabitPlanRequest { startDate: string; goals: Array<{ title: string; category: GoalCategory; description: string; habits: Array<{ title: string; targetMinutes: number; xpReward: number; weekdays: Weekday[]; objectives?: ObjectiveInput[] }> }>; }
export interface ImportedHabitPlanDto { goals: GoalDto[]; habits: HabitDto[]; }
export interface ApiErrorDto { requestId?: string; code: string; message: string; fields?: Record<string, string>; }
