import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from './client';
import { keys } from './queryKeys';

const ExerciseSchema = z.object({
  exerciseId: z.string(),
  name: z.string(),
  primaryMuscles: z.array(z.string()),
  movementPattern: z.string().optional().nullable(),
  techniqueTags: z.array(z.string()).optional().nullable(),
  isCustom: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Exercise = z.infer<typeof ExerciseSchema>;

const ProgressionSetSchema = z.object({
  setId: z.string(),
  date: z.string(),
  sessionId: z.string(),
  reps: z.number(),
  weight: z.number().nullable(),
  unit: z.enum(['kg', 'lb']),
});

export type ProgressionSet = z.infer<typeof ProgressionSetSchema>;

export function useExercises(search?: string) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return useQuery({
    queryKey: keys.exercises(search),
    queryFn: () =>
      apiFetch<{ exercises: Exercise[] }>(`/exercises${qs}`).then((d) =>
        z.array(ExerciseSchema).parse(d.exercises),
      ),
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Pick<Exercise, 'name' | 'primaryMuscles' | 'movementPattern' | 'techniqueTags'>) =>
      apiFetch<Exercise>('/exercises', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.exercises() }),
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exerciseId, ...data }: Partial<Exercise> & { exerciseId: string }) =>
      apiFetch<Exercise>(`/exercises/${exerciseId}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.exercises() }),
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (exerciseId: string) => apiFetch(`/exercises/${exerciseId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.exercises() }),
  });
}

export function useProgression(exerciseId: string) {
  return useQuery({
    queryKey: keys.progression(exerciseId),
    queryFn: () =>
      apiFetch<{ sets: ProgressionSet[] }>(`/exercises/${exerciseId}/progression`).then((d) =>
        z.array(ProgressionSetSchema).parse(d.sets),
      ),
    enabled: !!exerciseId,
  });
}
