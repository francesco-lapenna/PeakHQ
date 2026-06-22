import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from './client';
import { keys } from './queryKeys';

const ProfileSchema = z.object({
  weightUnit: z.enum(['kg', 'lb']),
  activeProgramId: z.string().nullable(),
  activeMealPlanId: z.string().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;

export function useProfile() {
  return useQuery({
    queryKey: keys.profile(),
    queryFn: () => apiFetch<Profile>('/profile').then((d) => ProfileSchema.parse(d)),
  });
}

export function usePutProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { weightUnit: 'kg' | 'lb' }) =>
      apiFetch<Profile>('/profile', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.profile() }),
  });
}

export function usePatchActiveProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { programId: string | null }) =>
      apiFetch<Profile>('/profile/active-program', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.profile() }),
  });
}

export function usePatchActiveMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { mealPlanId: string | null }) =>
      apiFetch<Profile>('/profile/active-meal-plan', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.profile() }),
  });
}
