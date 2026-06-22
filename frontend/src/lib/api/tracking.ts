import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from './client';
import { keys } from './queryKeys';

const BwEntrySchema = z.object({
  date: z.string(),
  weight: z.number(),
  unit: z.enum(['kg', 'lb']),
});

export type BwEntry = z.infer<typeof BwEntrySchema>;

const WeeklyLogSchema = z.object({
  weekStart: z.string(),
  liftingDays: z.number().nullable(),
  cardioMin: z.number().nullable(),
  stepsAvg: z.number().nullable(),
  rhr: z.number().nullable(),
  vo2max: z.number().nullable(),
  notes: z.string().nullable(),
  kcals: z.number().nullable(),
  deltaKcals: z.number().nullable(),
  avgBW: z.number().nullable(),
  deltaBW: z.number().nullable(),
  minBW: z.number().nullable(),
  maxBW: z.number().nullable(),
  bwUnit: z.string().nullable(),
});

export type WeeklyLog = z.infer<typeof WeeklyLogSchema>;

export function useBodyWeight(params?: { from?: string; to?: string }) {
  const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
  return useQuery({
    queryKey: keys.bodyWeight(params?.from, params?.to),
    queryFn: () =>
      apiFetch<{ entries: BwEntry[] }>(`/body-weight${qs ? `?${qs}` : ''}`).then((d) =>
        z.array(BwEntrySchema).parse(d.entries),
      ),
  });
}

export function usePutBodyWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, weight, unit }: { date: string; weight: number; unit: 'kg' | 'lb' }) =>
      apiFetch<BwEntry>(`/body-weight/${date}`, { method: 'PUT', body: JSON.stringify({ weight, unit }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.bodyWeight() });
      qc.invalidateQueries({ queryKey: keys.weeklyLogs() });
    },
  });
}

export function useDeleteBodyWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => apiFetch(`/body-weight/${date}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.bodyWeight() });
      qc.invalidateQueries({ queryKey: keys.weeklyLogs() });
    },
  });
}

export function useWeeklyLogs(params?: { from?: string; to?: string }) {
  const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
  return useQuery({
    queryKey: keys.weeklyLogs(params?.from, params?.to),
    queryFn: () =>
      apiFetch<{ weeks: WeeklyLog[] }>(`/weekly-logs${qs ? `?${qs}` : ''}`).then((d) =>
        z.array(WeeklyLogSchema).parse(d.weeks),
      ),
  });
}

export function usePutWeeklyLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ weekStart, ...data }: Partial<WeeklyLog> & { weekStart: string }) =>
      apiFetch<WeeklyLog>(`/weekly-logs/${weekStart}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.weeklyLogs() }),
  });
}
