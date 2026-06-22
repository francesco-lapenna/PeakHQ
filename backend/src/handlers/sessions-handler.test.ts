import { beforeEach, describe, expect, it, vi } from 'vitest';
import { docClient } from '../lib/dynamo.js';
import { makeEvent, TEST_USER_ID } from '../test-helpers/event.js';
import { handler } from './sessions-handler.js';

vi.mock('../lib/dynamo.js', () => ({
  docClient: { send: vi.fn() },
  TABLE: 'test-table',
}));

vi.mock('../lib/batchDelete.js', () => ({
  batchDelete: vi.fn().mockResolvedValue(undefined),
}));

import { batchDelete } from '../lib/batchDelete.js';

beforeEach(() => {
  vi.clearAllMocks();
});

const SESSION_DATE = '2026-06-20';
const SESSION_ID = 'sess-uuid-1';
const SET_ID = 'set-uuid-1';

const mockSession = {
  PK: `USER#${TEST_USER_ID}`,
  SK: `SESSION#${SESSION_DATE}#${SESSION_ID}`,
  sessionId: SESSION_ID,
  date: SESSION_DATE,
  startedAt: '2026-06-20T08:00:00Z',
  endedAt: '2026-06-20T09:15:00Z',
  programDayId: 'day-1',
  programId: 'prog-1',
  notes: null,
  createdAt: '2026-06-20T08:00:00Z',
  updatedAt: '2026-06-20T08:00:00Z',
};

const mockSet = {
  PK: `USER#${TEST_USER_ID}`,
  SK: `SESSION#${SESSION_ID}#SET#${SET_ID}`,
  GSI1PK: `USER#${TEST_USER_ID}#EXERCISE#ex-1`,
  GSI1SK: `SESSION#${SESSION_DATE}#${SESSION_ID}#SET#${SET_ID}`,
  setId: SET_ID,
  sessionId: SESSION_ID,
  exerciseId: 'ex-1',
  exerciseName: 'Barbell Bench Press',
  setNumber: 1,
  reps: 6,
  weight: 82.5,
  unit: 'kg',
  date: SESSION_DATE,
  createdAt: '2026-06-20T08:00:00Z',
};

// ─── List sessions ────────────────────────────────────────────────────────────

describe('GET /api/sessions', () => {
  it('returns sessions list with nextCursor null when no more pages', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Items: [mockSession] });
    const res = await handler(makeEvent({ routeKey: 'GET /api/sessions' }));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0].sessionId).toBe(SESSION_ID);
    expect(body.nextCursor).toBeNull();
  });

  it('returns nextCursor when DynamoDB has more pages', async () => {
    const lek = { PK: `USER#${TEST_USER_ID}`, SK: `SESSION#${SESSION_DATE}#${SESSION_ID}` };
    vi.mocked(docClient.send).mockResolvedValueOnce({ Items: [mockSession], LastEvaluatedKey: lek });
    const res = await handler(makeEvent({ routeKey: 'GET /api/sessions' }));
    const body = JSON.parse(res.body as string);
    expect(body.nextCursor).not.toBeNull();
    expect(typeof body.nextCursor).toBe('string');
  });

  it('passes decoded cursor as ExclusiveStartKey', async () => {
    const lek = { PK: `USER#${TEST_USER_ID}`, SK: `SESSION#${SESSION_DATE}#${SESSION_ID}` };
    const cursor = Buffer.from(JSON.stringify(lek)).toString('base64');
    vi.mocked(docClient.send).mockResolvedValueOnce({ Items: [] });
    await handler(makeEvent({ routeKey: 'GET /api/sessions', queryStringParameters: { cursor } }));
    const call = vi.mocked(docClient.send).mock.calls[0][0] as { input: Record<string, unknown> };
    expect(call.input.ExclusiveStartKey).toEqual(lek);
  });
});

// ─── Create session ───────────────────────────────────────────────────────────

describe('POST /api/sessions', () => {
  it('creates a session and returns 201', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const res = await handler(
      makeEvent({
        routeKey: 'POST /api/sessions',
        body: JSON.stringify({ date: SESSION_DATE, programDayId: 'day-1', programId: 'prog-1', notes: null }),
      }),
    );
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body as string);
    expect(body.sessionId).toBeDefined();
    expect(body.date).toBe(SESSION_DATE);
  });

  it('returns 400 for missing date', async () => {
    const res = await handler(
      makeEvent({ routeKey: 'POST /api/sessions', body: JSON.stringify({ notes: null }) }),
    );
    expect(res.statusCode).toBe(400);
  });
});

// ─── Get single session ───────────────────────────────────────────────────────

describe('GET /api/sessions/{id}', () => {
  it('returns session with sets', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Items: [mockSession] }) // find session by sessionId
      .mockResolvedValueOnce({ Items: [mockSet] });    // find sets
    const res = await handler(
      makeEvent({ routeKey: 'GET /api/sessions/{id}', pathParameters: { id: SESSION_ID } }),
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.sessionId).toBe(SESSION_ID);
    expect(body.sets).toHaveLength(1);
    expect(body.sets[0].setId).toBe(SET_ID);
  });

  it('returns 404 when session not found', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Items: [] });
    const res = await handler(
      makeEvent({ routeKey: 'GET /api/sessions/{id}', pathParameters: { id: 'missing' } }),
    );
    expect(res.statusCode).toBe(404);
  });
});

// ─── Patch session ────────────────────────────────────────────────────────────

describe('PATCH /api/sessions/{id}', () => {
  it('updates session and returns 200', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Items: [mockSession] }) // find session
      .mockResolvedValueOnce({ Attributes: { ...mockSession, endedAt: '2026-06-20T09:15:00Z', notes: 'Great session' } });
    const res = await handler(
      makeEvent({
        routeKey: 'PATCH /api/sessions/{id}',
        pathParameters: { id: SESSION_ID },
        body: JSON.stringify({ endedAt: '2026-06-20T09:15:00Z', notes: 'Great session' }),
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string).notes).toBe('Great session');
  });

  it('returns 404 when session not found', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Items: [] });
    const res = await handler(
      makeEvent({
        routeKey: 'PATCH /api/sessions/{id}',
        pathParameters: { id: 'missing' },
        body: JSON.stringify({ endedAt: '2026-06-20T09:15:00Z' }),
      }),
    );
    expect(res.statusCode).toBe(404);
  });
});

// ─── Delete session ───────────────────────────────────────────────────────────

describe('DELETE /api/sessions/{id}', () => {
  it('deletes session and all its sets, returns 204', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Items: [mockSession] })  // find session
      .mockResolvedValueOnce({ Items: [mockSet] });     // find sets
    const res = await handler(
      makeEvent({ routeKey: 'DELETE /api/sessions/{id}', pathParameters: { id: SESSION_ID } }),
    );
    expect(res.statusCode).toBe(204);
    expect(batchDelete).toHaveBeenCalledWith(
      expect.arrayContaining([
        { PK: `USER#${TEST_USER_ID}`, SK: `SESSION#${SESSION_DATE}#${SESSION_ID}` },
        { PK: `USER#${TEST_USER_ID}`, SK: `SESSION#${SESSION_ID}#SET#${SET_ID}` },
      ]),
    );
  });

  it('returns 404 when session not found', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Items: [] });
    const res = await handler(
      makeEvent({ routeKey: 'DELETE /api/sessions/{id}', pathParameters: { id: 'missing' } }),
    );
    expect(res.statusCode).toBe(404);
  });
});

// ─── Sets ─────────────────────────────────────────────────────────────────────

describe('POST /api/sessions/{id}/sets/{setId}', () => {
  it('creates a set with GSI1 keys and returns 201', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Items: [mockSession] }) // find session (for date)
      .mockResolvedValueOnce({});                      // PutItem set
    const res = await handler(
      makeEvent({
        routeKey: 'POST /api/sessions/{id}/sets/{setId}',
        pathParameters: { id: SESSION_ID, setId: 'ignored' },
        body: JSON.stringify({ exerciseId: 'ex-1', exerciseName: 'Barbell Bench Press', setNumber: 1, reps: 6, weight: 82.5, unit: 'kg' }),
      }),
    );
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body as string);
    expect(body.setId).toBeDefined();
    expect(body.GSI1PK).toBe(`USER#${TEST_USER_ID}#EXERCISE#ex-1`);
    expect(body.GSI1SK).toContain(`SESSION#${SESSION_DATE}#${SESSION_ID}#SET#`);
  });

  it('returns 404 when parent session not found', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Items: [] });
    const res = await handler(
      makeEvent({
        routeKey: 'POST /api/sessions/{id}/sets/{setId}',
        pathParameters: { id: 'missing', setId: 'ignored' },
        body: JSON.stringify({ exerciseId: 'ex-1', exerciseName: 'Bench', setNumber: 1, reps: 5, unit: 'kg' }),
      }),
    );
    expect(res.statusCode).toBe(404);
  });
});

describe('PUT /api/sessions/{id}/sets/{setId}', () => {
  it('updates a set and returns 200', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Attributes: { ...mockSet, reps: 8 } });
    const res = await handler(
      makeEvent({
        routeKey: 'PUT /api/sessions/{id}/sets/{setId}',
        pathParameters: { id: SESSION_ID, setId: SET_ID },
        body: JSON.stringify({ exerciseId: 'ex-1', exerciseName: 'Barbell Bench Press', setNumber: 1, reps: 8, weight: 82.5, unit: 'kg' }),
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string).reps).toBe(8);
  });
});

describe('DELETE /api/sessions/{id}/sets/{setId}', () => {
  it('deletes a set and returns 204', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const res = await handler(
      makeEvent({
        routeKey: 'DELETE /api/sessions/{id}/sets/{setId}',
        pathParameters: { id: SESSION_ID, setId: SET_ID },
      }),
    );
    expect(res.statusCode).toBe(204);
  });
});
