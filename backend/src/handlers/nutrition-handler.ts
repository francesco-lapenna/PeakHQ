import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { getUserId } from '../lib/auth.js';
import { docClient, TABLE } from '../lib/dynamo.js';
import { computeMealTotals, computePlanDeviations, sumTotals } from '../lib/nutritionHelpers.js';
import { badRequest, conflict, created, internalError, noContent, notFound, ok } from '../lib/response.js';

const PlanBodySchema = z.object({
  name: z.string().min(1),
  calorieTarget: z.number().positive(),
  proteinTargetG: z.number().min(0),
  carbsTargetG: z.number().min(0),
  fatTargetG: z.number().min(0),
});

const MealBodySchema = z.object({
  name: z.string().min(1),
  order: z.number().int().min(0),
  foodItems: z.array(z.record(z.unknown())).optional(),
});

const FavouriteBodySchema = z.object({
  offId: z.string().min(1),
  foodName: z.string().min(1),
  kcalPer100g: z.number().min(0),
  proteinPer100g: z.number().min(0),
  carbsPer100g: z.number().min(0),
  fatPer100g: z.number().min(0),
});

function stripKeys(item: Record<string, unknown>) {
  const { PK, SK, ...rest } = item;
  return rest;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function attachMealTotals(meal: Record<string, unknown>) {
  const foodItems = (meal.foodItems as Record<string, unknown>[]) ?? [];
  const totals = computeMealTotals(
    foodItems.map((f) => ({
      quantityG: f.quantityG as number,
      kcalPer100g: f.kcalPer100g as number,
      proteinPer100g: f.proteinPer100g as number,
      carbsPer100g: f.carbsPer100g as number,
      fatPer100g: f.fatPer100g as number,
    })),
  );
  return { ...stripKeys(meal), totals };
}

async function queryMeals(userId: string, mealPlanId: string) {
  const { Items = [] } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': `MEALPLAN#${mealPlanId}#MEAL#` },
  }));
  return Items.sort((a, b) => (a.order as number) - (b.order as number));
}

// ─── Meal Plans ───────────────────────────────────────────────────────────────

async function getMealPlans(userId: string): Promise<APIGatewayProxyResultV2> {
  const { Items: planItems = [] } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    FilterExpression: 'NOT contains(SK, :meal)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'MEALPLAN#', ':meal': '#MEAL#' },
  }));
  const mealPlans = await Promise.all(
    planItems.map(async (plan: Record<string, unknown>) => {
      const meals = await queryMeals(userId, plan.mealPlanId as string);
      const mealTotals = meals.map((m: Record<string, unknown>) => attachMealTotals(m).totals);
      const totals = sumTotals(mealTotals);
      return { ...stripKeys(plan), totals };
    }),
  );
  return ok({ mealPlans });
}

async function postMealPlan(userId: string, body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = PlanBodySchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const mealPlanId = crypto.randomUUID();
  const now = new Date().toISOString();
  const item = { PK: `USER#${userId}`, SK: `MEALPLAN#${mealPlanId}`, mealPlanId, ...parsed.data, createdAt: now, updatedAt: now };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  const emptyTotals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  return created({ ...stripKeys(item), totals: emptyTotals });
}

async function getMealPlan(userId: string, mealPlanId: string): Promise<APIGatewayProxyResultV2> {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { PK: `USER#${userId}`, SK: `MEALPLAN#${mealPlanId}` } }));
  if (!Item) return notFound(`Meal plan ${mealPlanId} not found.`);
  const meals = await queryMeals(userId, mealPlanId);
  const mealsWithTotals = meals.map((m: Record<string, unknown>) => attachMealTotals(m));
  const totals = sumTotals(mealsWithTotals.map((m) => m.totals));
  const deviations = computePlanDeviations(totals, {
    calorieTarget: Item.calorieTarget as number,
    proteinTargetG: Item.proteinTargetG as number,
    carbsTargetG: Item.carbsTargetG as number,
    fatTargetG: Item.fatTargetG as number,
  });
  return ok({ ...stripKeys(Item), meals: mealsWithTotals, totals, deviations });
}

async function putMealPlan(userId: string, mealPlanId: string, body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = PlanBodySchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: `MEALPLAN#${mealPlanId}` },
    UpdateExpression: 'SET #name = :name, calorieTarget = :kcal, proteinTargetG = :prot, carbsTargetG = :carbs, fatTargetG = :fat, updatedAt = :now',
    ExpressionAttributeNames: { '#name': 'name' },
    ExpressionAttributeValues: { ':name': parsed.data.name, ':kcal': parsed.data.calorieTarget, ':prot': parsed.data.proteinTargetG, ':carbs': parsed.data.carbsTargetG, ':fat': parsed.data.fatTargetG, ':now': new Date().toISOString() },
    ReturnValues: 'ALL_NEW',
  }));
  return ok(stripKeys(Attributes ?? {}));
}

async function deleteMealPlan(userId: string, mealPlanId: string): Promise<APIGatewayProxyResultV2> {
  const { Item: profile } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { PK: `USER#${userId}`, SK: 'PROFILE' } }));
  if (profile?.activeMealPlanId === mealPlanId) return conflict(`Meal plan ${mealPlanId} is currently active.`);
  await docClient.send(new DeleteCommand({ TableName: TABLE, Key: { PK: `USER#${userId}`, SK: `MEALPLAN#${mealPlanId}` } }));
  return noContent();
}

// ─── Meals ────────────────────────────────────────────────────────────────────

async function postMeal(userId: string, mealPlanId: string, body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = MealBodySchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const mealId = crypto.randomUUID();
  const now = new Date().toISOString();
  const foodItems = parsed.data.foodItems ?? [];
  const item = { PK: `USER#${userId}`, SK: `MEALPLAN#${mealPlanId}#MEAL#${mealId}`, mealId, mealPlanId, ...parsed.data, foodItems, createdAt: now, updatedAt: now };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  const totals = computeMealTotals([]);
  return created({ ...stripKeys(item), totals });
}

async function putMeal(userId: string, mealPlanId: string, mealId: string, body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = MealBodySchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const foodItems = parsed.data.foodItems ?? [];
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: `MEALPLAN#${mealPlanId}#MEAL#${mealId}` },
    UpdateExpression: 'SET #name = :name, #order = :order, foodItems = :fi, updatedAt = :now',
    ExpressionAttributeNames: { '#name': 'name', '#order': 'order' },
    ExpressionAttributeValues: { ':name': parsed.data.name, ':order': parsed.data.order, ':fi': foodItems, ':now': new Date().toISOString() },
    ReturnValues: 'ALL_NEW',
  }));
  return ok(attachMealTotals(Attributes ?? {}));
}

async function deleteMeal(userId: string, mealPlanId: string, mealId: string): Promise<APIGatewayProxyResultV2> {
  await docClient.send(new DeleteCommand({ TableName: TABLE, Key: { PK: `USER#${userId}`, SK: `MEALPLAN#${mealPlanId}#MEAL#${mealId}` } }));
  return noContent();
}

// ─── Favourites ───────────────────────────────────────────────────────────────

async function getFavourites(userId: string): Promise<APIGatewayProxyResultV2> {
  const { Items = [] } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'FAVOURITE#' },
  }));
  return ok({ favourites: Items.map(stripKeys) });
}

async function postFavourite(userId: string, body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = FavouriteBodySchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const item = { PK: `USER#${userId}`, SK: `FAVOURITE#${parsed.data.offId}`, ...parsed.data, addedAt: new Date().toISOString() };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return created(stripKeys(item));
}

async function deleteFavourite(userId: string, offId: string): Promise<APIGatewayProxyResultV2> {
  await docClient.send(new DeleteCommand({ TableName: TABLE, Key: { PK: `USER#${userId}`, SK: `FAVOURITE#${offId}` } }));
  return noContent();
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserId(event);
    const pp = event.pathParameters as Record<string, string> | undefined;
    const { mealPlanId = '', mealId = '', offId = '' } = pp ?? {};
    switch (event.routeKey) {
      case 'GET /api/meal-plans':
        return getMealPlans(userId);
      case 'POST /api/meal-plans':
        return postMealPlan(userId, event.body ?? null);
      case 'GET /api/meal-plans/{mealPlanId}':
        return getMealPlan(userId, mealPlanId);
      case 'PUT /api/meal-plans/{mealPlanId}':
        return putMealPlan(userId, mealPlanId, event.body ?? null);
      case 'DELETE /api/meal-plans/{mealPlanId}':
        return deleteMealPlan(userId, mealPlanId);
      case 'POST /api/meal-plans/{mealPlanId}/meals/{mealId}':
        return postMeal(userId, mealPlanId, event.body ?? null);
      case 'PUT /api/meal-plans/{mealPlanId}/meals/{mealId}':
        return putMeal(userId, mealPlanId, mealId, event.body ?? null);
      case 'DELETE /api/meal-plans/{mealPlanId}/meals/{mealId}':
        return deleteMeal(userId, mealPlanId, mealId);
      case 'GET /api/favourites':
        return getFavourites(userId);
      case 'POST /api/favourites':
        return postFavourite(userId, event.body ?? null);
      case 'DELETE /api/favourites/{offId}':
        return deleteFavourite(userId, offId);
      default:
        return notFound('Route not found.');
    }
  } catch {
    return internalError();
  }
};
