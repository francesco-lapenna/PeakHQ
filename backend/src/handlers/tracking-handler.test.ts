import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { docClient } from '../lib/dynamo.js';
import { makeEvent, TEST_USER_ID } from '../test-helpers/event.js';
import { handler } from './tracking-handler.js';

vi.mock('../lib/dynamo.js', () => ({
  docClient: { send: vi.fn() },
  TABLE: 'test-table',
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Body Weight ─────────────────────────────────────────────────────────────

describe('GET /api/body-weight', () => {
  it('returns all entries when no date range given', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({
      Items: [
        { date: '2026-06-15', weight: 82.0, unit: 'kg' },
        { date: '2026-06-16', weight: 82.3, unit: 'kg' },
      ],
    });
    const res = await handler(makeEvent({ routeKey: 'GET /api/body-weight' }));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.entries).toHaveLength(2);
  });

  it('queries with SK between range when from/to provided', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Items: [] });
    await handler(
      makeEvent({
        routeKey: 'GET /api/body-weight',
        queryStringParameters: { from: '2026-06-01', to: '2026-06-30' },
      }),
    );
    const cmd = vi.mocked(docClient.send).mock.calls[0][0] as QueryCommand;
    expect(cmd.input.ExpressionAttributeValues?.[':skStart']).toBe('BW#2026-06-01');
    expect(cmd.input.ExpressionAttributeValues?.[':skEnd']).toBe('BW#2026-06-30');
  });
});

describe('PUT /api/body-weight/{date}', () => {
  it('upserts entry and returns 200', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const res = await handler(
      makeEvent({
        routeKey: 'PUT /api/body-weight/{date}',
        pathParameters: { date: '2026-06-22' },
        body: JSON.stringify({ weight: 82.5, unit: 'kg' }),
      }),
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.date).toBe('2026-06-22');
    expect(body.weight).toBe(82.5);
    const cmd = vi.mocked(docClient.send).mock.calls[0][0] as PutCommand;
    expect(cmd.input.Item?.SK).toBe('BW#2026-06-22');
  });

  it('returns 400 for invalid body', async () => {
    const res = await handler(
      makeEvent({
        routeKey: 'PUT /api/body-weight/{date}',
        pathParameters: { date: '2026-06-22' },
        body: JSON.stringify({ weight: -1, unit: 'kg' }),
      }),
    );
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid unit', async () => {
    const res = await handler(
      makeEvent({
        routeKey: 'PUT /api/body-weight/{date}',
        pathParameters: { date: '2026-06-22' },
        body: JSON.stringify({ weight: 80, unit: 'stone' }),
      }),
    );
    expect(res.statusCode).toBe(400);
  });
});

describe('DELETE /api/body-weight/{date}', () => {
  it('deletes entry and returns 204', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const res = await handler(
      makeEvent({
        routeKey: 'DELETE /api/body-weight/{date}',
        pathParameters: { date: '2026-06-22' },
      }),
    );
    expect(res.statusCode).toBe(204);
  });
});

// ─── Weekly Logs ──────────────────────────────────────────────────────────────

const mockWeeklyLog = {
  weekStart: '2026-06-15',
  liftingDays: 4,
  cardioMin: 60,
  stepsAvg: 8500,
  rhr: 52,
  vo2max: 48.5,
  notes: 'Good week',
  updatedAt: '2026-06-22T00:00:00Z',
};

const mockBwEntries = [
  { date: '2026-06-15', weight: 82.0, unit: 'kg' },
  { date: '2026-06-16', weight: 83.0, unit: 'kg' },
  { date: '2026-06-22', weight: 82.5, unit: 'kg' },
];

const mockProfile = {
  weightUnit: 'kg',
  activeProgramId: null,
  activeMealPlanId: null,
};

describe('GET /api/weekly-logs', () => {
  it('returns weeks with computed BW stats', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Items: [mockWeeklyLog] })
      .mockResolvedValueOnce({
        Items: [
          { date: '2026-06-15', weight: 82.0, unit: 'kg' },
          { date: '2026-06-16', weight: 83.0, unit: 'kg' },
        ],
      })
      .mockResolvedValueOnce({ Item: mockProfile });
    const res = await handler(
      makeEvent({
        routeKey: 'GET /api/weekly-logs',
        queryStringParameters: { from: '2026-06-15', to: '2026-06-15' },
      }),
    );
    expect(res.statusCode).toBe(200);
    const { weeks } = JSON.parse(res.body as string);
    expect(weeks).toHaveLength(1);
    expect(weeks[0].avgBW).toBe(82.5);
    expect(weeks[0].minBW).toBe(82.0);
    expect(weeks[0].maxBW).toBe(83.0);
    expect(weeks[0].liftingDays).toBe(4);
  });

  it('sets deltaBW when previous week has BW data', async () => {
    const prevWeekBw = { date: '2026-06-08', weight: 82.0, unit: 'kg' };
    const thisWeekBw = { date: '2026-06-15', weight: 83.0, unit: 'kg' };
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Items: [mockWeeklyLog] })
      .mockResolvedValueOnce({ Items: [prevWeekBw, thisWeekBw] })
      .mockResolvedValueOnce({ Item: mockProfile });
    const res = await handler(
      makeEvent({
        routeKey: 'GET /api/weekly-logs',
        queryStringParameters: { from: '2026-06-15', to: '2026-06-15' },
      }),
    );
    const { weeks } = JSON.parse(res.body as string);
    expect(weeks[0].deltaBW).toBe(1);
  });

  it('sets deltaBW null when no prior BW data', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Items: [mockWeeklyLog] })
      .mockResolvedValueOnce({ Items: [{ date: '2026-06-15', weight: 82.0, unit: 'kg' }] })
      .mockResolvedValueOnce({ Item: mockProfile });
    const res = await handler(
      makeEvent({
        routeKey: 'GET /api/weekly-logs',
        queryStringParameters: { from: '2026-06-15', to: '2026-06-15' },
      }),
    );
    const { weeks } = JSON.parse(res.body as string);
    expect(weeks[0].deltaBW).toBeNull();
  });

  it('sets kcals null when no active meal plan', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Items: [mockWeeklyLog] })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Item: { ...mockProfile, activeMealPlanId: null } });
    const res = await handler(
      makeEvent({
        routeKey: 'GET /api/weekly-logs',
        queryStringParameters: { from: '2026-06-15', to: '2026-06-15' },
      }),
    );
    const { weeks } = JSON.parse(res.body as string);
    expect(weeks[0].kcals).toBeNull();
    expect(weeks[0].deltaKcals).toBeNull();
  });
});

describe('PUT /api/weekly-logs/{weekStart}', () => {
  it('upserts weekly log and returns 200', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const res = await handler(
      makeEvent({
        routeKey: 'PUT /api/weekly-logs/{weekStart}',
        pathParameters: { weekStart: '2026-06-15' },
        body: JSON.stringify({ liftingDays: 4, cardioMin: 60 }),
      }),
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.weekStart).toBe('2026-06-15');
    expect(body.liftingDays).toBe(4);
  });

  it('returns 400 for non-Monday weekStart', async () => {
    const res = await handler(
      makeEvent({
        routeKey: 'PUT /api/weekly-logs/{weekStart}',
        pathParameters: { weekStart: '2026-06-16' },
        body: JSON.stringify({ liftingDays: 3 }),
      }),
    );
    expect(res.statusCode).toBe(400);
  });
});
