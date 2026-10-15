import type { AnalyticsDto, CreateGoalRequest, CreateHabitRequest, DailyDashboardDto, GoalDto, HabitDto, JourneyDto, ProgressDto, QuestDto, BossMutationDto, QuestMutationDto, UserDto } from './types';
export interface LifeOsApi {
  getMe(): Promise<UserDto>;
  getDashboard(date?: string): Promise<DailyDashboardDto>;
  getGoals(): Promise<GoalDto[]>;
  createGoal(input: CreateGoalRequest): Promise<GoalDto>;
  updateGoal(id: string, patch: Partial<Pick<GoalDto,'title'|'description'|'status'>>): Promise<GoalDto>;
  getHabits(): Promise<HabitDto[]>;
  createHabit(input: CreateHabitRequest): Promise<HabitDto>;
  updateHabit(id: string, patch: Partial<Pick<HabitDto,'status'>>): Promise<HabitDto>;
  getQuests(date: string): Promise<QuestDto[]>;
  completeQuest(habitId: string, date: string): Promise<QuestMutationDto>;
  undoQuest(habitId: string, date: string): Promise<QuestMutationDto>;
  defeatBoss(bossId: string): Promise<BossMutationDto>;
  undoBoss(bossId: string): Promise<BossMutationDto>;
  getProgress(): Promise<ProgressDto>;
  getAnalytics(period: '7d'|'30d'): Promise<AnalyticsDto>;
  getCurrentJourney(): Promise<JourneyDto | null>;
}
