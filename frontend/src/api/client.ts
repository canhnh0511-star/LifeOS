import type { BodyGoalDto, BadgeDto, WorkoutStatsDto, LastWorkoutSetsDto, WorkoutSetDto, WorkoutSetInput, MetricDto, ItemDto, AnalyticsDto, CreateGoalRequest, CreateHabitRequest, DailyDashboardDto, GoalDto, HabitDto, ImportHabitPlanRequest, ImportedHabitPlanDto, TrainingPlanDto, JourneyDto, ProgressDto, QuestDto, AchievementDto, BossMutationDto, PatchHabit, QuestMutationDto, UserDto, RegisterRequest, LoginRequest } from './types';
export interface LifeOsApi {
  getMe(): Promise<UserDto>;
  /** Real mode only; the mock has no accounts and always acts as the demo user. */
  register(input: RegisterRequest): Promise<UserDto>;
  login(input: LoginRequest): Promise<UserDto>;
  logout(): Promise<void>;
  getDashboard(date?: string): Promise<DailyDashboardDto>;
  getGoals(): Promise<GoalDto[]>;
  createGoal(input: CreateGoalRequest): Promise<GoalDto>;
  updateGoal(id: string, patch: Partial<Pick<GoalDto,'title'|'description'|'status'>>): Promise<GoalDto>;
  getHabits(): Promise<HabitDto[]>;
  createHabit(input: CreateHabitRequest): Promise<HabitDto>;
  updateHabit(id: string, patch: PatchHabit): Promise<HabitDto>;
  /** Atomic bulk create of goals and habits; no screen uses it yet (UI is locked), it is driven by docs/seed files. */
  importHabitPlan(input: ImportHabitPlanRequest): Promise<ImportedHabitPlanDto>;
  /** The account's gym plan, or the standard plan (started=false) when it has none; creates nothing. */
  getPlan(): Promise<TrainingPlanDto>;
  /** The account's body goal; rejects with 404 until one is saved. */
  getBodyGoal(): Promise<BodyGoalDto>;
  saveBodyGoal(input: BodyGoalDto): Promise<BodyGoalDto>;
  /** Creates the standard plan for this account unless it already has it (idempotent). */
  startPlan(startDate: string): Promise<TrainingPlanDto>;
  /** Adds the walks and stretching to a plan started without them, from `startDate` on (ADR-045). Idempotent. */
  addRecoveryDays(startDate: string): Promise<TrainingPlanDto>;
  getQuests(date: string): Promise<QuestDto[]>;
  completeQuest(habitId: string, date: string): Promise<QuestMutationDto>;
  undoQuest(habitId: string, date: string): Promise<QuestMutationDto>;
  /** Sets one checklist line to an absolute value; the quest completes/undoes itself when every line reaches/leaves its target. */
  setObjective(habitId: string, date: string, objectiveId: string, value: number): Promise<QuestMutationDto>;
  defeatBoss(bossId: string): Promise<BossMutationDto>;
  undoBoss(bossId: string): Promise<BossMutationDto>;
  getAchievements(): Promise<AchievementDto[]>;
  /** The whole catalog with this user's ownership; locked entries have `owned: false`. */
  getItems(): Promise<ItemDto[]>;
  getMetrics(): Promise<MetricDto[]>;
  createMetric(input: { name: string; unit: string }): Promise<MetricDto>;
  /** One value per metric per day; recording the same day again replaces it. Returns the metric with its entries. */
  getWorkoutSets(habitId: string, date: string): Promise<WorkoutSetDto[]>;
  recordWorkoutSet(habitId: string, date: string, input: WorkoutSetInput): Promise<WorkoutSetDto[]>;
  removeWorkoutSet(habitId: string, date: string, exercise: string, setNo: number): Promise<WorkoutSetDto[]>;
  getBadges(): Promise<BadgeDto[]>;
  getWorkoutStats(days: number): Promise<WorkoutStatsDto>;
  getLastWorkoutSets(exercise: string, before: string): Promise<LastWorkoutSetsDto>;
  recordMeasurement(metricId: string, date: string, value: number): Promise<MetricDto>;
  removeMeasurement(metricId: string, date: string): Promise<MetricDto>;
  deleteMetric(metricId: string): Promise<void>;
  /** Wears an owned item; the item already worn in the same slot is taken off. 404 when not owned. */
  equipItem(code: string): Promise<ItemDto>;
  unequipItem(code: string): Promise<ItemDto>;
  getProgress(): Promise<ProgressDto>;
  getAnalytics(period: '7d'|'30d'): Promise<AnalyticsDto>;
  getCurrentJourney(): Promise<JourneyDto | null>;
}
