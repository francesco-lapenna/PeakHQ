import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from './client';
import { keys } from './queryKeys';

const FoodItemSchema = z.object({
  offId: z.string(),
  name: z.string(),
  quantityG: z.number(),
  kcalPer100g: z.number(),
  proteinPer100g: z.number(),
  carbsPer100g: z.number(),
  fatPer100g: z.number(),
});

const MealTotalsSchema = z.object({
  kcal: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

const MealSchema = z.object({
  mealId: z.string(),
  name: z.string(),
  order: z.number(),
  foodItems: z.array(FoodItemSchema),
  totals: MealTotalsSchema.optional(),
});

const MealPlanSchema = z.object({
  mealPlanId: z.string(),
  name: z.string(),
  targetKcal: z.number().nullable(),
  targetProtein: z.number().nullable(),
  targetCarbs: z.number().nullable(),
  targetFat: z.number().nullable(),
  meals: z.array(MealSchema),
  totals: MealTotalsSchema.optional(),
  deviations: MealTotalsSchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const FavouriteSchema = z.object({
  offId: z.string(),
  name: z.string(),
  kcalPer100g: z.number(),
  proteinPer100g: z.number(),
  carbsPer100g: z.number(),
  fatPer100g: z.number(),
  addedAt: z.string().optional(),
});

export type MealPlan = z.infer<typeof MealPlanSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type FoodItem = z.infer<typeof FoodItemSchema>;
export type Favourite = z.infer<typeof FavouriteSchema>;

export function useMealPlans() {
  return useQuery({
    queryKey: keys.mealPlans(),
    queryFn: () =>
      apiFetch<{ mealPlans: MealPlan[] }>('/meal-plans').then((d) =>
        z.array(MealPlanSchema).parse(d.mealPlans),
      ),
  });
}

export function useMealPlan(id: string) {
  return useQuery({
    queryKey: keys.mealPlan(id),
    queryFn: () => apiFetch<MealPlan>(`/meal-plans/${id}`).then((d) => MealPlanSchema.parse(d)),
    enabled: !!id,
  });
}

export function useCreateMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      targetKcal?: number;
      targetProtein?: number;
      targetCarbs?: number;
      targetFat?: number;
    }) => apiFetch<MealPlan>('/meal-plans', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.mealPlans() }),
  });
}

export function useUpdateMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mealPlanId, ...data }: Partial<MealPlan> & { mealPlanId: string }) =>
      apiFetch<MealPlan>(`/meal-plans/${mealPlanId}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_, { mealPlanId }) => {
      qc.invalidateQueries({ queryKey: keys.mealPlans() });
      qc.invalidateQueries({ queryKey: keys.mealPlan(mealPlanId) });
    },
  });
}

export function useDeleteMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mealPlanId: string) => apiFetch(`/meal-plans/${mealPlanId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.mealPlans() }),
  });
}

export function useCreateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mealPlanId, ...data }: { mealPlanId: string; name: string; foodItems?: FoodItem[] }) =>
      apiFetch<Meal>(`/meal-plans/${mealPlanId}/meals`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_, { mealPlanId }) => {
      qc.invalidateQueries({ queryKey: keys.mealPlans() });
      qc.invalidateQueries({ queryKey: keys.mealPlan(mealPlanId) });
    },
  });
}

export function useUpdateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mealPlanId, mealId, ...data }: Partial<Meal> & { mealPlanId: string; mealId: string }) =>
      apiFetch<Meal>(`/meal-plans/${mealPlanId}/meals/${mealId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { mealPlanId }) => {
      qc.invalidateQueries({ queryKey: keys.mealPlans() });
      qc.invalidateQueries({ queryKey: keys.mealPlan(mealPlanId) });
    },
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mealPlanId, mealId }: { mealPlanId: string; mealId: string }) =>
      apiFetch(`/meal-plans/${mealPlanId}/meals/${mealId}`, { method: 'DELETE' }),
    onSuccess: (_, { mealPlanId }) => {
      qc.invalidateQueries({ queryKey: keys.mealPlans() });
      qc.invalidateQueries({ queryKey: keys.mealPlan(mealPlanId) });
    },
  });
}

export function useFavourites() {
  return useQuery({
    queryKey: keys.favourites(),
    queryFn: () =>
      apiFetch<{ favourites: Favourite[] }>('/favourites').then((d) =>
        z.array(FavouriteSchema).parse(d.favourites),
      ),
  });
}

export function useAddFavourite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Favourite) =>
      apiFetch<Favourite>('/favourites', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.favourites() }),
  });
}

export function useDeleteFavourite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (offId: string) => apiFetch(`/favourites/${offId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.favourites() }),
  });
}
