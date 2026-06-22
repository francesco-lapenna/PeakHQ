export interface BwEntry {
  date: string;
  weight: number;
}

export interface BwStats {
  avgBW: number | null;
  minBW: number | null;
  maxBW: number | null;
}

export function computeBwStats(entries: BwEntry[], weekStart: string): BwStats {
  const weekEnd = addDays(weekStart, 6);
  const inRange = entries.filter((e) => e.date >= weekStart && e.date <= weekEnd);
  if (inRange.length === 0) return { avgBW: null, minBW: null, maxBW: null };
  const weights = inRange.map((e) => e.weight);
  const avg = weights.reduce((s, w) => s + w, 0) / weights.length;
  return {
    avgBW: Math.round(avg * 100) / 100,
    minBW: Math.min(...weights),
    maxBW: Math.max(...weights),
  };
}

export function getMondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function addWeeks(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function isMonday(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00Z').getUTCDay() === 1;
}
