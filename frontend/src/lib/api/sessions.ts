import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from './client';
import { keys } from './queryKeys';

const SetSchema = z.object({
  setId: z.string(),
  sessionId: z.string(),
  exerciseId: z.string(),
  exerciseName: z.string(),
  setNumber: z.number(),
  reps: z.number(),
  weight: z.number().nullable(),
  unit: z.enum(['kg', 'lb']),
  date: z.string(),
  createdAt: z.string(),
});

const SessionSchema = z.object({
  sessionId: z.string(),
  date: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  programDayId: z.string().nullable(),
  programId: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sets: z.array(SetSchema).optional(),
});

export type Session = z.infer<typeof SessionSchema>;
export type TrainingSet = z.infer<typeof SetSchema>;

export function useSessions(params?: { from?: string; to?: string; limit?: number }) {
  const qs = params
    ? new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : '';
  return useQuery({
    queryKey: keys.sessions(params),
    queryFn: () =>
      apiFetch<{ sessions: Session[]; nextCursor: string | null }>(`/sessions${qs ? `?${qs}` : ''}`).then(
        (d) => d,
      ),
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: keys.session(id),
    queryFn: () => apiFetch<Session>(`/sessions/${id}`).then((d) => SessionSchema.parse(d)),
    enabled: !!id,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; programDayId?: string; programId?: string; notes?: string }) =>
      apiFetch<Session>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.sessions() }),
  });
}

export function usePatchSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, ...data }: { sessionId: string; endedAt?: string | null; notes?: string | null }) =>
      apiFetch<Session>(`/sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_, { sessionId }) => {
      qc.invalidateQueries({ queryKey: keys.sessions() });
      qc.invalidateQueries({ queryKey: keys.session(sessionId) });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => apiFetch(`/sessions/${sessionId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.sessions() }),
  });
}

export function useCreateSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      ...data
    }: {
      sessionId: string;
      exerciseId: string;
      exerciseName: string;
      setNumber: number;
      reps: number;
      weight?: number | null;
      unit: 'kg' | 'lb';
    }) =>
      apiFetch<TrainingSet>(`/sessions/${sessionId}/sets/${crypto.randomUUID()}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { sessionId }) => qc.invalidateQueries({ queryKey: keys.session(sessionId) }),
  });
}

export function useUpdateSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      setId,
      ...data
    }: { sessionId: string; setId: string } & Partial<TrainingSet>) =>
      apiFetch<TrainingSet>(`/sessions/${sessionId}/sets/${setId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { sessionId }) => qc.invalidateQueries({ queryKey: keys.session(sessionId) }),
  });
}

export function useDeleteSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, setId }: { sessionId: string; setId: string }) =>
      apiFetch(`/sessions/${sessionId}/sets/${setId}`, { method: 'DELETE' }),
    onSuccess: (_, { sessionId }) => qc.invalidateQueries({ queryKey: keys.session(sessionId) }),
  });
}
