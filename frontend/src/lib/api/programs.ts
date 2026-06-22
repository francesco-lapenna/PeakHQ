import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from './client';
import { keys } from './queryKeys';

const ExerciseEntrySchema = z.object({
  exerciseId: z.string(),
  exerciseName: z.string(),
  order: z.number(),
  plannedSets: z.number().nullable().optional(),
  plannedReps: z.string().nullable().optional(),
  weight: z.number().nullable().optional(),
  rpe: z.number().nullable().optional(),
  restSec: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const ProgramDaySchema = z.object({
  dayId: z.string(),
  name: z.string(),
  order: z.number(),
  exercises: z.array(ExerciseEntrySchema),
});

const ProgramSchema = z.object({
  programId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  days: z.array(ProgramDaySchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Program = z.infer<typeof ProgramSchema>;
export type ProgramDay = z.infer<typeof ProgramDaySchema>;
export type ExerciseEntry = z.infer<typeof ExerciseEntrySchema>;

export function usePrograms() {
  return useQuery({
    queryKey: keys.programs(),
    queryFn: () =>
      apiFetch<{ programs: Program[] }>('/programs').then((d) =>
        z.array(ProgramSchema).parse(d.programs),
      ),
  });
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: keys.program(id),
    queryFn: () => apiFetch<Program>(`/programs/${id}`).then((d) => ProgramSchema.parse(d)),
    enabled: !!id,
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiFetch<Program>('/programs', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.programs() }),
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, ...data }: Partial<Program> & { programId: string }) =>
      apiFetch<Program>(`/programs/${programId}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.programs() }),
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (programId: string) => apiFetch(`/programs/${programId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.programs() }),
  });
}

export function useCreateDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, ...data }: { programId: string; name: string; exercises?: ExerciseEntry[] }) =>
      apiFetch<ProgramDay>(`/programs/${programId}/days`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_, { programId }) => {
      qc.invalidateQueries({ queryKey: keys.programs() });
      qc.invalidateQueries({ queryKey: keys.program(programId) });
    },
  });
}

export function useUpdateDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, dayId, ...data }: Partial<ProgramDay> & { programId: string; dayId: string }) =>
      apiFetch<ProgramDay>(`/programs/${programId}/days/${dayId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { programId }) => {
      qc.invalidateQueries({ queryKey: keys.programs() });
      qc.invalidateQueries({ queryKey: keys.program(programId) });
    },
  });
}

export function useDeleteDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, dayId }: { programId: string; dayId: string }) =>
      apiFetch(`/programs/${programId}/days/${dayId}`, { method: 'DELETE' }),
    onSuccess: (_, { programId }) => {
      qc.invalidateQueries({ queryKey: keys.programs() });
      qc.invalidateQueries({ queryKey: keys.program(programId) });
    },
  });
}

export function useReorderDays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, order }: { programId: string; order: { dayId: string; order: number }[] }) =>
      apiFetch(`/programs/${programId}/days/reorder`, { method: 'POST', body: JSON.stringify({ order }) }),
    onSuccess: (_, { programId }) => {
      qc.invalidateQueries({ queryKey: keys.programs() });
      qc.invalidateQueries({ queryKey: keys.program(programId) });
    },
  });
}
