import { beforeEach, describe, expect, it, vi } from 'vitest';
import { docClient } from '../lib/dynamo.js';
import { makeEvent, TEST_USER_ID } from '../test-helpers/event.js';
import { handler } from './programs-handler.js';

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

const mockProgram = {
  PK: `USER#${TEST_USER_ID}`,
  SK: 'PROGRAM#prog-1',
  programId: 'prog-1',
  name: 'PPL',
  description: 'Push Pull Legs',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockDay = {
  PK: `USER#${TEST_USER_ID}`,
  SK: 'PROGRAM#prog-1#DAY#day-1',
  dayId: 'day-1',
  programId: 'prog-1',
  name: 'Push A',
  order: 0,
  exercises: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('GET /api/programs', () => {
  it('returns programs with embedded days', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Items: [mockProgram] })
      .mockResolvedValueOnce({ Items: [mockDay] });
    const res = await handler(makeEvent({ routeKey: 'GET /api/programs' }));
    expect(res.statusCode).toBe(200);
    const { programs } = JSON.parse(res.body as string);
    expect(programs).toHaveLength(1);
    expect(programs[0].days).toHaveLength(1);
    expect(programs[0].days[0].name).toBe('Push A');
  });
});

describe('POST /api/programs', () => {
  it('creates a program and returns 201 with empty days', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const res = await handler(
      makeEvent({
        routeKey: 'POST /api/programs',
        body: JSON.stringify({ name: 'PPL', description: 'Test' }),
      }),
    );
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body as string);
    expect(body.days).toEqual([]);
    expect(body.programId).toBeDefined();
  });

  it('returns 400 for missing name', async () => {
    const res = await handler(
      makeEvent({ routeKey: 'POST /api/programs', body: JSON.stringify({ description: 'x' }) }),
    );
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/programs/{programId}', () => {
  it('returns program with days', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Item: mockProgram })
      .mockResolvedValueOnce({ Items: [mockDay] });
    const res = await handler(
      makeEvent({ routeKey: 'GET /api/programs/{programId}', pathParameters: { programId: 'prog-1' } }),
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string).days).toHaveLength(1);
  });

  it('returns 404 when program not found', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Item: undefined });
    const res = await handler(
      makeEvent({ routeKey: 'GET /api/programs/{programId}', pathParameters: { programId: 'missing' } }),
    );
    expect(res.statusCode).toBe(404);
  });
});

describe('PUT /api/programs/{programId}', () => {
  it('updates name and description and returns 200', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Attributes: { ...mockProgram, name: 'New Name' } });
    const res = await handler(
      makeEvent({
        routeKey: 'PUT /api/programs/{programId}',
        pathParameters: { programId: 'prog-1' },
        body: JSON.stringify({ name: 'New Name', description: 'Updated' }),
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string).name).toBe('New Name');
  });
});

describe('DELETE /api/programs/{programId}', () => {
  it('deletes program and its days and returns 204', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Item: { activeProgramId: null } })
      .mockResolvedValueOnce({ Items: [mockDay] });
    const res = await handler(
      makeEvent({ routeKey: 'DELETE /api/programs/{programId}', pathParameters: { programId: 'prog-1' } }),
    );
    expect(res.statusCode).toBe(204);
    expect(batchDelete).toHaveBeenCalledWith(
      expect.arrayContaining([
        { PK: `USER#${TEST_USER_ID}`, SK: 'PROGRAM#prog-1' },
        { PK: `USER#${TEST_USER_ID}`, SK: 'PROGRAM#prog-1#DAY#day-1' },
      ]),
    );
  });

  it('returns 409 when program is active', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Item: { activeProgramId: 'prog-1' } });
    const res = await handler(
      makeEvent({ routeKey: 'DELETE /api/programs/{programId}', pathParameters: { programId: 'prog-1' } }),
    );
    expect(res.statusCode).toBe(409);
  });
});

describe('POST /api/programs/{programId}/days/{dayId}', () => {
  it('creates a day and returns 201', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const res = await handler(
      makeEvent({
        routeKey: 'POST /api/programs/{programId}/days/{dayId}',
        pathParameters: { programId: 'prog-1', dayId: 'irrelevant' },
        body: JSON.stringify({ name: 'Push A', order: 0, exercises: [] }),
      }),
    );
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body as string).exercises).toEqual([]);
  });
});

describe('PUT /api/programs/{programId}/days/{dayId}', () => {
  it('updates a day and returns 200', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Attributes: mockDay });
    const res = await handler(
      makeEvent({
        routeKey: 'PUT /api/programs/{programId}/days/{dayId}',
        pathParameters: { programId: 'prog-1', dayId: 'day-1' },
        body: JSON.stringify({ name: 'Push A', order: 0, exercises: [] }),
      }),
    );
    expect(res.statusCode).toBe(200);
  });
});

describe('DELETE /api/programs/{programId}/days/{dayId}', () => {
  it('deletes a day and returns 204', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const res = await handler(
      makeEvent({
        routeKey: 'DELETE /api/programs/{programId}/days/{dayId}',
        pathParameters: { programId: 'prog-1', dayId: 'day-1' },
      }),
    );
    expect(res.statusCode).toBe(204);
  });
});

describe('PATCH /api/programs/{programId}/days/reorder', () => {
  it('updates order on all days and returns updated days', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Attributes: { ...mockDay, dayId: 'day-2', order: 0 } })
      .mockResolvedValueOnce({ Attributes: { ...mockDay, dayId: 'day-1', order: 1 } });
    const res = await handler(
      makeEvent({
        routeKey: 'PATCH /api/programs/{programId}/days/reorder',
        pathParameters: { programId: 'prog-1' },
        body: JSON.stringify({ dayOrder: ['day-2', 'day-1'] }),
      }),
    );
    expect(res.statusCode).toBe(200);
    const { days } = JSON.parse(res.body as string);
    expect(days).toHaveLength(2);
  });

  it('returns 400 for missing dayOrder', async () => {
    const res = await handler(
      makeEvent({
        routeKey: 'PATCH /api/programs/{programId}/days/reorder',
        pathParameters: { programId: 'prog-1' },
        body: JSON.stringify({}),
      }),
    );
    expect(res.statusCode).toBe(400);
  });
});
