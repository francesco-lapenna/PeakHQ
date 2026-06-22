import { beforeEach, describe, expect, it, vi } from 'vitest';
import { docClient } from '../lib/dynamo.js';
import { makeEvent, TEST_USER_ID } from '../test-helpers/event.js';
import { handler } from './nutrition-handler.js';

vi.mock('../lib/dynamo.js', () => ({
  docClient: { send: vi.fn() },
  TABLE: 'test-table',
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const mockPlan = {
  PK: `USER#${TEST_USER_ID}`,
  SK: 'MEALPLAN#mp-1',
  mealPlanId: 'mp-1',
  name: 'Bulk 3500 kcal',
  calorieTarget: 3500,
  proteinTargetG: 180,
  carbsTargetG: 400,
  fatTargetG: 100,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockMeal = {
  PK: `USER#${TEST_USER_ID}`,
  SK: 'MEALPLAN#mp-1#MEAL#meal-1',
  mealId: 'meal-1',
  mealPlanId: 'mp-1',
  name: 'Breakfast',
  order: 0,
  foodItems: [
    {
      foodItemId: 'fi-1',
      offId: '3017620422003',
      foodName: 'Nutella',
      quantityG: 30,
      kcalPer100g: 539,
      proteinPer100g: 6.3,
      carbsPer100g: 57.5,
      fatPer100g: 30.9,
    },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockFavourite = {
  PK: `USER#${TEST_USER_ID}`,
  SK: 'FAVOURITE#3017620422003',
  offId: '3017620422003',
  foodName: 'Nutella',
  kcalPer100g: 539,
  proteinPer100g: 6.3,
  carbsPer100g: 57.5,
  fatPer100g: 30.9,
  addedAt: '2026-01-01T00:00:00Z',
};

// ─── Meal Plans ───────────────────────────────────────────────────────────────

describe('GET /api/meal-plans', () => {
  it('returns plans with computed totals', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Items: [mockPlan] })
      .mockResolvedValueOnce({ Items: [mockMeal] });
    const res = await handler(makeEvent({ routeKey: 'GET /api/meal-plans' }));
    expect(res.statusCode).toBe(200);
    const { mealPlans } = JSON.parse(res.body as string);
    expect(mealPlans).toHaveLength(1);
    expect(mealPlans[0].totals.kcal).toBeCloseTo(161.7, 1);
  });
});

describe('POST /api/meal-plans', () => {
  it('creates a meal plan and returns 201', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const res = await handler(
      makeEvent({
        routeKey: 'POST /api/meal-plans',
        body: JSON.stringify({ name: 'Bulk', calorieTarget: 3500, proteinTargetG: 180, carbsTargetG: 400, fatTargetG: 100 }),
      }),
    );
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body as string);
    expect(body.mealPlanId).toBeDefined();
    expect(body.totals).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });

  it('returns 400 for missing calorieTarget', async () => {
    const res = await handler(
      makeEvent({ routeKey: 'POST /api/meal-plans', body: JSON.stringify({ name: 'x' }) }),
    );
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/meal-plans/{mealPlanId}', () => {
  it('returns plan with meals, per-meal totals, plan totals and deviations', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Item: mockPlan })
      .mockResolvedValueOnce({ Items: [mockMeal] });
    const res = await handler(
      makeEvent({ routeKey: 'GET /api/meal-plans/{mealPlanId}', pathParameters: { mealPlanId: 'mp-1' } }),
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.meals).toHaveLength(1);
    expect(body.meals[0].totals.kcal).toBeCloseTo(161.7, 1);
    expect(body.totals).toBeDefined();
    expect(body.deviations).toBeDefined();
    expect(body.deviations.kcal).toBeCloseTo(161.7 - 3500, 0);
  });

  it('returns 404 when not found', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Item: undefined });
    const res = await handler(
      makeEvent({ routeKey: 'GET /api/meal-plans/{mealPlanId}', pathParameters: { mealPlanId: 'missing' } }),
    );
    expect(res.statusCode).toBe(404);
  });
});

describe('PUT /api/meal-plans/{mealPlanId}', () => {
  it('updates plan metadata and returns 200', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Attributes: { ...mockPlan, name: 'Cut' } });
    const res = await handler(
      makeEvent({
        routeKey: 'PUT /api/meal-plans/{mealPlanId}',
        pathParameters: { mealPlanId: 'mp-1' },
        body: JSON.stringify({ name: 'Cut', calorieTarget: 2500, proteinTargetG: 180, carbsTargetG: 250, fatTargetG: 80 }),
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string).name).toBe('Cut');
  });
});

describe('DELETE /api/meal-plans/{mealPlanId}', () => {
  it('deletes plan and returns 204', async () => {
    vi.mocked(docClient.send)
      .mockResolvedValueOnce({ Item: { activeMealPlanId: null } })
      .mockResolvedValueOnce({});
    const res = await handler(
      makeEvent({ routeKey: 'DELETE /api/meal-plans/{mealPlanId}', pathParameters: { mealPlanId: 'mp-1' } }),
    );
    expect(res.statusCode).toBe(204);
  });

  it('returns 409 when plan is active', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Item: { activeMealPlanId: 'mp-1' } });
    const res = await handler(
      makeEvent({ routeKey: 'DELETE /api/meal-plans/{mealPlanId}', pathParameters: { mealPlanId: 'mp-1' } }),
    );
    expect(res.statusCode).toBe(409);
  });
});

// ─── Meals ────────────────────────────────────────────────────────────────────

describe('POST /api/meal-plans/{mealPlanId}/meals/{mealId}', () => {
  it('creates a meal with empty foodItems and returns 201', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const res = await handler(
      makeEvent({
        routeKey: 'POST /api/meal-plans/{mealPlanId}/meals/{mealId}',
        pathParameters: { mealPlanId: 'mp-1', mealId: 'ignored' },
        body: JSON.stringify({ name: 'Breakfast', order: 0 }),
      }),
    );
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body as string);
    expect(body.foodItems).toEqual([]);
    expect(body.totals).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});

describe('PUT /api/meal-plans/{mealPlanId}/meals/{mealId}', () => {
  it('replaces meal and returns 200 with computed totals', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Attributes: { ...mockMeal } });
    const res = await handler(
      makeEvent({
        routeKey: 'PUT /api/meal-plans/{mealPlanId}/meals/{mealId}',
        pathParameters: { mealPlanId: 'mp-1', mealId: 'meal-1' },
        body: JSON.stringify({
          name: 'Breakfast',
          order: 0,
          foodItems: [{ offId: '123', foodName: 'Egg', quantityG: 50, kcalPer100g: 140, proteinPer100g: 12, carbsPer100g: 1, fatPer100g: 10 }],
        }),
      }),
    );
    expect(res.statusCode).toBe(200);
  });
});

describe('DELETE /api/meal-plans/{mealPlanId}/meals/{mealId}', () => {
  it('deletes meal and returns 204', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const res = await handler(
      makeEvent({
        routeKey: 'DELETE /api/meal-plans/{mealPlanId}/meals/{mealId}',
        pathParameters: { mealPlanId: 'mp-1', mealId: 'meal-1' },
      }),
    );
    expect(res.statusCode).toBe(204);
  });
});

// ─── Favourites ───────────────────────────────────────────────────────────────

describe('GET /api/favourites', () => {
  it('returns list of favourites', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({ Items: [mockFavourite] });
    const res = await handler(makeEvent({ routeKey: 'GET /api/favourites' }));
    expect(res.statusCode).toBe(200);
    const { favourites } = JSON.parse(res.body as string);
    expect(favourites).toHaveLength(1);
    expect(favourites[0].offId).toBe('3017620422003');
  });
});

describe('POST /api/favourites', () => {
  it('adds favourite and returns 201', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const res = await handler(
      makeEvent({
        routeKey: 'POST /api/favourites',
        body: JSON.stringify({ offId: '123', foodName: 'Egg', kcalPer100g: 140, proteinPer100g: 12, carbsPer100g: 1, fatPer100g: 10 }),
      }),
    );
    expect(res.statusCode).toBe(201);
  });
});

describe('DELETE /api/favourites/{offId}', () => {
  it('deletes favourite and returns 204', async () => {
    vi.mocked(docClient.send).mockResolvedValueOnce({});
    const res = await handler(
      makeEvent({
        routeKey: 'DELETE /api/favourites/{offId}',
        pathParameters: { offId: '3017620422003' },
      }),
    );
    expect(res.statusCode).toBe(204);
  });
});
