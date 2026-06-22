import { DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { docClient } from '../lib/dynamo.js';
import { makeEvent, TEST_USER_ID } from '../test-helpers/event.js';
import { handler } from './exercises-handler.js';

vi.mock('../lib/dynamo.js', () => ({
  docClient: { send: vi.fn() },
  TABLE: 'test-table',
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const libraryEx = {
  PK: 'EXERCISE_LIBRARY',
  SK: 'EXERCISE#ex-lib-1',
  exerciseId: 'ex-lib-1',
  name: 'Barbell Back Squat',
  primaryMuscles: ['quads', 'glutes'],
  movementPattern: 'squat',
  techniqueTags: [],
  isCustom: false,
};

const customEx = {
  PK: `USER#${TEST_USER_ID}`,
  SK: 'EXERCISE#ex-custom-1',
  exerciseId: 'ex-custom-1',
  name: 'Meadows Row',
  primaryMuscles: ['lats'],
  movementPattern: 'horizontal_pull',
  techniqueTags: [],
  isCustom: true,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('GET /api/exercises', () => {
  it('merges library and custom exercises', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Items: [libraryEx] })
      .mockResolvedValueOnce({ Items: [customEx] });
    const res = await handler(makeEvent({ routeKey: 'GET /api/exercises' }));
    expect(res.statusCode).toBe(200);
    const { exercises } = JSON.parse(res.body as string);
    expect(exercises).toHaveLength(2);
  });

  it('filters by search query (case-insensitive)', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Items: [libraryEx] })
      .mockResolvedValueOnce({ Items: [customEx] });
    const res = await handler(
      makeEvent({
        routeKey: 'GET /api/exercises',
        queryStringParameters: { search: 'squat' },
      }),
    );
    const { exercises } = JSON.parse(res.body as string);
    expect(exercises).toHaveLength(1);
    expect(exercises[0].name).toBe('Barbell Back Squat');
  });

  it('returns empty list when nothing found', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Items: [] });
    const res = await handler(makeEvent({ routeKey: 'GET /api/exercises' }));
    expect(JSON.parse(res.body as string).exercises).toHaveLength(0);
  });
});

describe('POST /api/exercises', () => {
  it('creates a custom exercise and returns 201', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const res = await handler(
      makeEvent({
        routeKey: 'POST /api/exercises',
        body: JSON.stringify({
          name: 'Meadows Row',
          primaryMuscles: ['lats'],
          movementPattern: 'horizontal_pull',
          techniqueTags: [],
        }),
      }),
    );
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body as string);
    expect(body.isCustom).toBe(true);
    expect(body.exerciseId).toBeDefined();
    const cmd = vi.mocked(docClient.send).mock.calls[0][0] as PutCommand;
    expect(cmd.input.Item?.PK).toBe(`USER#${TEST_USER_ID}`);
  });

  it('returns 400 for missing name', async () => {
    const res = await handler(
      makeEvent({ routeKey: 'POST /api/exercises', body: JSON.stringify({ primaryMuscles: [] }) }),
    );
    expect(res.statusCode).toBe(400);
  });
});

describe('PUT /api/exercises/{exerciseId}', () => {
  it('updates a custom exercise and returns 200', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Item: customEx })      // custom GetItem
      .mockResolvedValueOnce({ Item: undefined })     // library GetItem
      .mockResolvedValueOnce({ Attributes: { ...customEx, name: 'Updated' } }); // UpdateItem
    const res = await handler(
      makeEvent({
        routeKey: 'PUT /api/exercises/{exerciseId}',
        pathParameters: { exerciseId: 'ex-custom-1' },
        body: JSON.stringify({
          name: 'Updated',
          primaryMuscles: ['lats'],
          movementPattern: 'horizontal_pull',
          techniqueTags: [],
        }),
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string).name).toBe('Updated');
  });

  it('returns 409 when trying to update a library exercise', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Item: undefined })   // custom GetItem (not found)
      .mockResolvedValueOnce({ Item: libraryEx });  // library GetItem
    const res = await handler(
      makeEvent({
        routeKey: 'PUT /api/exercises/{exerciseId}',
        pathParameters: { exerciseId: 'ex-lib-1' },
        body: JSON.stringify({ name: 'x', primaryMuscles: [], movementPattern: 'squat', techniqueTags: [] }),
      }),
    );
    expect(res.statusCode).toBe(409);
  });

  it('returns 404 when exercise not found', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Item: undefined })  // custom GetItem
      .mockResolvedValueOnce({ Item: undefined }); // library GetItem
    const res = await handler(
      makeEvent({
        routeKey: 'PUT /api/exercises/{exerciseId}',
        pathParameters: { exerciseId: 'missing' },
        body: JSON.stringify({ name: 'x', primaryMuscles: [], movementPattern: 'squat', techniqueTags: [] }),
      }),
    );
    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/exercises/{exerciseId}', () => {
  it('deletes a custom exercise and returns 204', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Item: customEx })   // custom GetItem
      .mockResolvedValueOnce({ Item: undefined })  // library GetItem
      .mockResolvedValueOnce({ Items: [] })        // days query (no references)
      .mockResolvedValueOnce({});                  // DeleteItem
    const res = await handler(
      makeEvent({
        routeKey: 'DELETE /api/exercises/{exerciseId}',
        pathParameters: { exerciseId: 'ex-custom-1' },
      }),
    );
    expect(res.statusCode).toBe(204);
  });

  it('returns 409 when exercise is referenced in a program day', async () => {
    const dayWithExercise = {
      SK: `PROGRAM#prog-1#DAY#day-1`,
      exercises: [{ exerciseId: 'ex-custom-1' }],
    };
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Item: customEx })           // custom GetItem
      .mockResolvedValueOnce({ Item: undefined })          // library GetItem
      .mockResolvedValueOnce({ Items: [dayWithExercise] }); // days query
    const res = await handler(
      makeEvent({
        routeKey: 'DELETE /api/exercises/{exerciseId}',
        pathParameters: { exerciseId: 'ex-custom-1' },
      }),
    );
    expect(res.statusCode).toBe(409);
  });

  it('returns 409 when trying to delete a library exercise', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Item: undefined })  // custom GetItem (not found)
      .mockResolvedValueOnce({ Item: libraryEx }); // library GetItem
    const res = await handler(
      makeEvent({
        routeKey: 'DELETE /api/exercises/{exerciseId}',
        pathParameters: { exerciseId: 'ex-lib-1' },
      }),
    );
    expect(res.statusCode).toBe(409);
  });

  it('returns 404 when exercise not found', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Item: undefined })  // custom GetItem
      .mockResolvedValueOnce({ Item: undefined }); // library GetItem
    const res = await handler(
      makeEvent({
        routeKey: 'DELETE /api/exercises/{exerciseId}',
        pathParameters: { exerciseId: 'missing' },
      }),
    );
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/exercises/{exerciseId}/progression', () => {
  it('returns sets sorted ascending by date', async () => {
    const sets = [
      {
        setId: 's1',
        sessionId: 'sess-1',
        exerciseId: 'ex-lib-1',
        exerciseName: 'Barbell Back Squat',
        setNumber: 1,
        reps: 6,
        weight: 80,
        unit: 'kg',
        date: '2026-06-01',
      },
    ];
    vi.mocked(docClient.send).mockResolvedValueOnce({ Items: sets });
    const res = await handler(
      makeEvent({
        routeKey: 'GET /api/exercises/{exerciseId}/progression',
        pathParameters: { exerciseId: 'ex-lib-1' },
      }),
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.exerciseId).toBe('ex-lib-1');
    expect(body.sets).toHaveLength(1);
    expect(body.sets[0].date).toBe('2026-06-01');
    const cmd = vi.mocked(docClient.send).mock.calls[0][0] as QueryCommand;
    expect(cmd.input.IndexName).toBe('GSI1');
  });

  it('returns empty sets array when no progression data', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Items: [] });
    const res = await handler(
      makeEvent({
        routeKey: 'GET /api/exercises/{exerciseId}/progression',
        pathParameters: { exerciseId: 'ex-lib-1' },
      }),
    );
    expect(JSON.parse(res.body as string).sets).toHaveLength(0);
  });
});
