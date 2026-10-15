/** Public DTO contract. See docs/API_CONTRACT.md. Dates: YYYY-MM-DD (user timezone). Instants: UTC ISO 8601. */
export type GoalCategory = 'CAREER' | 'CREATIVITY' | 'HEALTH' | 'KNOWLEDGE' | 'MINDFULNESS';
export type RecordStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type QuestStatus = 'PENDING' | 'COMPLETED' | 'SKIPPED';
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export interface UserDto { id: string; displayName: string; email: string; timezone: string; }
export interface GoalDto { id: string; title: string; category: GoalCategory; description: string; status: RecordStatus; createdAt: string; }
export interface HabitDto { id: string; goalId: string; title: string; targetMinutes: number; xpReward: number; weekdays: Weekday[]; startDate: string; endDate: string | null; status: RecordStatus; }
export interface QuestDto { habitId: string; goalId: string; goalTitle: string; title: string; targetMinutes: number; xpReward: number; category: GoalCategory; date: string; status: QuestStatus; completedAt: string | null; }
export interface ProgressDto { totalXp: number; level: number; levelStartXp: number; nextLevelXp: number; currentStreak: number; longestStreak: number; }
export interface DailyDashboardDto { date: string; user: UserDto; quests: QuestDto[]; progress: ProgressDto; completedCount: number; scheduledCount: number; earnedXpToday: number; journey: JourneyDto | null; }
export interface JourneyDto { id: string; title: string; startDate: string; durationDays: number; elapsedDays: number; totalScheduledToDate: number; completedToDate: number; status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'; }
export interface DayStatDto { date: string; scheduled: number; completed: number; xpEarned: number; }
export interface CategoryStatDto { category: GoalCategory; scheduled: number; completed: number; }
export interface AnalyticsDto { period: '7d' | '30d'; days: DayStatDto[]; completionRate: number; completedCount: number; scheduledCount: number; earnedXp: number; categories: CategoryStatDto[]; }
export interface QuestMutationDto { habitId: string; date: string; status: 'PENDING' | 'COMPLETED'; xpAwarded: number; totalXp: number; level: number; streak: number; }
export interface CreateGoalRequest { title: string; category: GoalCategory; description: string; }
export interface CreateHabitRequest { title: string; goalId: string; targetMinutes: number; xpReward: number; weekdays: Weekday[]; startDate: string; }
export interface ApiErrorDto { code: string; message: string; fields?: Record<string, string>; }
