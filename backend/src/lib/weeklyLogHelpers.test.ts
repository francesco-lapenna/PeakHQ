import { describe, expect, it } from 'vitest';
import {
  addDays,
  addWeeks,
  computeBwStats,
  getMondayOf,
  isMonday,
} from './weeklyLogHelpers.js';

describe('computeBwStats', () => {
  it('returns all null for empty entries', () => {
    expect(computeBwStats([], '2026-06-16')).toEqual({
      avgBW: null,
      minBW: null,
      maxBW: null,
    });
  });

  it('returns entry values for a single entry in range', () => {
    const result = computeBwStats([{ date: '2026-06-17', weight: 82.5 }], '2026-06-16');
    expect(result).toEqual({ avgBW: 82.5, minBW: 82.5, maxBW: 82.5 });
  });

  it('computes avg, min, max for multiple entries', () => {
    const entries = [
      { date: '2026-06-16', weight: 82.0 },
      { date: '2026-06-17', weight: 83.0 },
      { date: '2026-06-18', weight: 81.0 },
    ];
    const result = computeBwStats(entries, '2026-06-16');
    expect(result.avgBW).toBe(82);
    expect(result.minBW).toBe(81.0);
    expect(result.maxBW).toBe(83.0);
  });

  it('ignores entries outside the Mon–Sun window', () => {
    const entries = [
      { date: '2026-06-15', weight: 70.0 },
      { date: '2026-06-17', weight: 82.5 },
      { date: '2026-06-23', weight: 70.0 },
    ];
    const result = computeBwStats(entries, '2026-06-16');
    expect(result).toEqual({ avgBW: 82.5, minBW: 82.5, maxBW: 82.5 });
  });
});

describe('getMondayOf', () => {
  it('returns Monday for a Wednesday', () => {
    expect(getMondayOf(new Date('2026-06-17T00:00:00Z'))).toBe('2026-06-15');
  });

  it('returns the same day for a Monday', () => {
    expect(getMondayOf(new Date('2026-06-15T00:00:00Z'))).toBe('2026-06-15');
  });

  it('handles Sunday (returns preceding Monday)', () => {
    expect(getMondayOf(new Date('2026-06-21T00:00:00Z'))).toBe('2026-06-15');
  });
});

describe('addWeeks', () => {
  it('adds positive weeks', () => {
    expect(addWeeks('2026-06-16', 2)).toBe('2026-06-30');
  });

  it('subtracts weeks with negative n', () => {
    expect(addWeeks('2026-06-16', -1)).toBe('2026-06-09');
  });

  it('handles year boundary', () => {
    expect(addWeeks('2025-12-29', 1)).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('adds days correctly', () => {
    expect(addDays('2026-06-16', 6)).toBe('2026-06-22');
  });
});

describe('isMonday', () => {
  it('returns true for a Monday', () => {
    expect(isMonday('2026-06-15')).toBe(true);
  });

  it('returns false for a Tuesday', () => {
    expect(isMonday('2026-06-16')).toBe(false);
  });
});
