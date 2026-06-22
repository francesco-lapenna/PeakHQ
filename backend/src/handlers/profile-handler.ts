import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { getUserId } from '../lib/auth.js';
import { docClient, TABLE } from '../lib/dynamo.js';
import { badRequest, internalError, notFound, ok } from '../lib/response.js';

const ProfileSchema = z.object({ weightUnit: z.enum(['kg', 'lb']) });
const PatchProgramSchema = z.object({ programId: z.string().nullable() });
const PatchMealPlanSchema = z.object({ mealPlanId: z.string().nullable() });

async function getProfile(userId: string): Promise<APIGatewayProxyResultV2> {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { PK: `USER#${userId}`, SK: 'PROFILE' } }),
  );
  if (!Item) return notFound('Profile not found.');
  const { PK: _pk, SK: _sk, ...profile } = Item;
  return ok(profile);
}

async function putProfile(userId: string, body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = ProfileSchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const now = new Date().toISOString();
  const item = {
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    weightUnit: parsed.data.weightUnit,
    activeProgramId: null,
    activeMealPlanId: null,
    createdAt: now,
    updatedAt: now,
  };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  const { PK: _pk, SK: _sk, ...profile } = item;
  return ok(profile);
}

async function patchActiveProgram(
  userId: string,
  body: string | null,
): Promise<APIGatewayProxyResultV2> {
  const parsed = PatchProgramSchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const { programId } = parsed.data;

  if (programId !== null) {
    const { Item } = await docClient.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `USER#${userId}`, SK: `PROGRAM#${programId}` },
      }),
    );
    if (!Item) return notFound(`Program ${programId} not found.`);
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression: 'SET activeProgramId = :val, updatedAt = :now',
      ExpressionAttributeValues: { ':val': programId, ':now': new Date().toISOString() },
      ReturnValues: 'ALL_NEW',
    }),
  );
  const { PK: _pk, SK: _sk, ...profile } = Attributes ?? {};
  return ok(profile);
}

async function patchActiveMealPlan(
  userId: string,
  body: string | null,
): Promise<APIGatewayProxyResultV2> {
  const parsed = PatchMealPlanSchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const { mealPlanId } = parsed.data;

  if (mealPlanId !== null) {
    const { Item } = await docClient.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `USER#${userId}`, SK: `MEALPLAN#${mealPlanId}` },
      }),
    );
    if (!Item) return notFound(`Meal plan ${mealPlanId} not found.`);
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression: 'SET activeMealPlanId = :val, updatedAt = :now',
      ExpressionAttributeValues: { ':val': mealPlanId, ':now': new Date().toISOString() },
      ReturnValues: 'ALL_NEW',
    }),
  );
  const { PK: _pk, SK: _sk, ...profile } = Attributes ?? {};
  return ok(profile);
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserId(event);
    switch (event.routeKey) {
      case 'GET /api/profile':
        return getProfile(userId);
      case 'PUT /api/profile':
        return putProfile(userId, event.body ?? null);
      case 'PATCH /api/profile/active-program':
        return patchActiveProgram(userId, event.body ?? null);
      case 'PATCH /api/profile/active-meal-plan':
        return patchActiveMealPlan(userId, event.body ?? null);
      default:
        return notFound('Route not found.');
    }
  } catch {
    return internalError();
  }
};
