import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { docClient } from '../lib/dynamo.js';
import { makeEvent, TEST_USER_ID } from '../test-helpers/event.js';
import { handler } from './profile-handler.js';

vi.mock('../lib/dynamo.js', () => ({
  docClient: { send: vi.fn() },
  TABLE: 'test-table',
}));

const mockProfile = {
  weightUnit: 'kg',
  activeProgramId: 'prog-1',
  activeMealPlanId: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/profile', () => {
  it('returns 200 with profile when found', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Item: mockProfile });
    const res = await handler(makeEvent({ routeKey: 'GET /api/profile' }));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.weightUnit).toBe('kg');
    expect(body.activeProgramId).toBe('prog-1');
  });

  it('returns 404 when profile not found', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Item: undefined });
    const res = await handler(makeEvent({ routeKey: 'GET /api/profile' }));
    expect(res.statusCode).toBe(404);
  });
});

describe('PUT /api/profile', () => {
  it('creates profile and returns 200', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const res = await handler(
      makeEvent({ routeKey: 'PUT /api/profile', body: JSON.stringify({ weightUnit: 'kg' }) }),
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.weightUnit).toBe('kg');
    const cmd = vi.mocked(docClient.send).mock.calls[0][0] as PutCommand;
    expect(cmd.input.Item?.PK).toBe(`USER#${TEST_USER_ID}`);
    expect(cmd.input.Item?.SK).toBe('PROFILE');
  });

  it('returns 400 for invalid weightUnit', async () => {
    const res = await handler(
      makeEvent({ routeKey: 'PUT /api/profile', body: JSON.stringify({ weightUnit: 'stone' }) }),
    );
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when body is missing', async () => {
    const res = await handler(makeEvent({ routeKey: 'PUT /api/profile', body: null }));
    expect(res.statusCode).toBe(400);
  });
});

describe('PATCH /api/profile/active-program', () => {
  it('sets active program and returns 200', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Item: { programId: 'prog-1' } })
      .mockResolvedValueOnce({ Attributes: { ...mockProfile, activeProgramId: 'prog-1' } });
    const res = await handler(
      makeEvent({
        routeKey: 'PATCH /api/profile/active-program',
        body: JSON.stringify({ programId: 'prog-1' }),
      }),
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.activeProgramId).toBe('prog-1');
  });

  it('returns 404 when program does not exist', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Item: undefined });
    const res = await handler(
      makeEvent({
        routeKey: 'PATCH /api/profile/active-program',
        body: JSON.stringify({ programId: 'missing' }),
      }),
    );
    expect(res.statusCode).toBe(404);
  });

  it('clears active program when programId is null', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({
      Attributes: { ...mockProfile, activeProgramId: null },
    });
    const res = await handler(
      makeEvent({
        routeKey: 'PATCH /api/profile/active-program',
        body: JSON.stringify({ programId: null }),
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(vi.mocked(docClient.send)).toHaveBeenCalledTimes(1);
    const cmd = vi.mocked(docClient.send).mock.calls[0][0] as UpdateCommand;
    expect(cmd.input.ExpressionAttributeValues?.[':val']).toBeNull();
  });
});

describe('PATCH /api/profile/active-meal-plan', () => {
  it('sets active meal plan and returns 200', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Item: { mealPlanId: 'mp-1' } })
      .mockResolvedValueOnce({ Attributes: { ...mockProfile, activeMealPlanId: 'mp-1' } });
    const res = await handler(
      makeEvent({
        routeKey: 'PATCH /api/profile/active-meal-plan',
        body: JSON.stringify({ mealPlanId: 'mp-1' }),
      }),
    );
    expect(res.statusCode).toBe(200);
  });

  it('returns 404 when meal plan does not exist', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Item: undefined });
    const res = await handler(
      makeEvent({
        routeKey: 'PATCH /api/profile/active-meal-plan',
        body: JSON.stringify({ mealPlanId: 'missing' }),
      }),
    );
    expect(res.statusCode).toBe(404);
  });

  it('clears active meal plan when mealPlanId is null', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({
      Attributes: { ...mockProfile, activeMealPlanId: null },
    });
    const res = await handler(
      makeEvent({
        routeKey: 'PATCH /api/profile/active-meal-plan',
        body: JSON.stringify({ mealPlanId: null }),
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(vi.mocked(docClient.send)).toHaveBeenCalledTimes(1);
  });
});
