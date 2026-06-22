export const keys = {
  profile: () => ['profile'] as const,
  weeklyLogs: (from?: string, to?: string) => ['weekly-logs', from, to] as const,
  bodyWeight: (from?: string, to?: string) => ['body-weight', from, to] as const,
  exercises: (search?: string) => ['exercises', search] as const,
  programs: () => ['programs'] as const,
  program: (id: string) => ['programs', id] as const,
  sessions: (params?: object) => ['sessions', params] as const,
  session: (id: string) => ['sessions', id] as const,
  mealPlans: () => ['meal-plans'] as const,
  mealPlan: (id: string) => ['meal-plans', id] as const,
  favourites: () => ['favourites'] as const,
  progression: (exerciseId: string) => ['progression', exerciseId] as const,
};
