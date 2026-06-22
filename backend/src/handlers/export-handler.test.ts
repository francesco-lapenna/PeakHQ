import { beforeEach, describe, expect, it, vi } from 'vitest';
import { docClient } from '../lib/dynamo.js';
import { makeEvent } from '../test-helpers/event.js';
import { handler } from './export-handler.js';

vi.mock('../lib/dynamo.js', () => ({
  docClient: { send: vi.fn() },
  TABLE: 'test-table',
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/export', () => {
  it('returns JSON export with all entity keys and exportedAt timestamp', async () => {
    // 11 parallel queries: profile(Get) + exercises + programs + program_days +
    // sessions + session_sets + meal_plans + meals + favourites + bw_entries + weekly_logs
    for (let i = 0; i < 11; i++) {
      vi.mocked(docClient.send).mockResolvedValueOnce(i === 0 ? { Item: { weightUnit: 'kg' } } : { Items: [] });
    }
    const res = await handler(makeEvent({ routeKey: 'GET /api/export' }));
    expect(res.statusCode).toBe(200);
    const headers = (res as { headers?: Record<string, string> }).headers ?? {};
    expect(headers['Content-Disposition']).toMatch(/attachment; filename="peakhq-export-\d{4}-\d{2}-\d{2}\.json"/);
    const body = JSON.parse(res.body as string);
    expect(body.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.profile).toBeDefined();
    expect(body.exercises).toBeInstanceOf(Array);
    expect(body.programs).toBeInstanceOf(Array);
    expect(body.programDays).toBeInstanceOf(Array);
    expect(body.sessions).toBeInstanceOf(Array);
    expect(body.sessionSets).toBeInstanceOf(Array);
    expect(body.mealPlans).toBeInstanceOf(Array);
    expect(body.meals).toBeInstanceOf(Array);
    expect(body.favourites).toBeInstanceOf(Array);
    expect(body.bodyWeightEntries).toBeInstanceOf(Array);
    expect(body.weeklyLogs).toBeInstanceOf(Array);
  });

  it('returns 501 for CSV format', async () => {
    const res = await handler(
      makeEvent({ routeKey: 'GET /api/export', queryStringParameters: { format: 'csv' } }),
    );
    expect(res.statusCode).toBe(501);
    expect(JSON.parse(res.body as string).error.code).toBe('NOT_IMPLEMENTED');
  });
});
