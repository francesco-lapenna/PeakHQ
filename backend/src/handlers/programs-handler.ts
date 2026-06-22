import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { getUserId } from '../lib/auth.js';
import { batchDelete } from '../lib/batchDelete.js';
import { docClient, TABLE } from '../lib/dynamo.js';
import { badRequest, conflict, created, internalError, noContent, notFound, ok } from '../lib/response.js';

const ProgramBodySchema = z.object({ name: z.string().min(1), description: z.string().optional() });
const DayBodySchema = z.object({
  name: z.string().min(1),
  order: z.number().int().min(0),
  exercises: z.array(z.record(z.unknown())),
});
const ReorderSchema = z.object({ dayOrder: z.array(z.string()).min(1) });

function stripKeys(item: Record<string, unknown>) {
  const { PK: _pk, SK: _sk, ...rest } = item;
  return rest;
}

async function queryDays(userId: string, programId: string) {
  const { Items = [] } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': `PROGRAM#${programId}#DAY#` },
  }));
  return Items.sort((a, b) => (a.order as number) - (b.order as number));
}

async function getPrograms(userId: string): Promise<APIGatewayProxyResultV2> {
  const { Items: programItems = [] } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    FilterExpression: 'NOT contains(SK, :day)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'PROGRAM#', ':day': '#DAY#' },
  }));
  const programs = await Promise.all(
    programItems.map(async (prog: Record<string, unknown>) => {
      const days = await queryDays(userId, prog.programId as string);
      return { ...stripKeys(prog), days: days.map(stripKeys) };
    }),
  );
  return ok({ programs });
}

async function postProgram(userId: string, body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = ProgramBodySchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const programId = crypto.randomUUID();
  const now = new Date().toISOString();
  const item = { PK: `USER#${userId}`, SK: `PROGRAM#${programId}`, programId, ...parsed.data, createdAt: now, updatedAt: now };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return created({ ...stripKeys(item), days: [] });
}

async function getProgram(userId: string, programId: string): Promise<APIGatewayProxyResultV2> {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { PK: `USER#${userId}`, SK: `PROGRAM#${programId}` } }));
  if (!Item) return notFound(`Program ${programId} not found.`);
  const days = await queryDays(userId, programId);
  return ok({ ...stripKeys(Item), days: days.map(stripKeys) });
}

async function putProgram(userId: string, programId: string, body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = ProgramBodySchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: `PROGRAM#${programId}` },
    UpdateExpression: 'SET #name = :name, description = :desc, updatedAt = :now',
    ExpressionAttributeNames: { '#name': 'name' },
    ExpressionAttributeValues: { ':name': parsed.data.name, ':desc': parsed.data.description ?? null, ':now': new Date().toISOString() },
    ReturnValues: 'ALL_NEW',
  }));
  return ok(stripKeys(Attributes ?? {}));
}

async function deleteProgram(userId: string, programId: string): Promise<APIGatewayProxyResultV2> {
  const { Item: profile } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { PK: `USER#${userId}`, SK: 'PROFILE' } }));
  if (profile?.activeProgramId === programId) return conflict(`Program ${programId} is currently active.`);
  const days = await queryDays(userId, programId);
  await batchDelete([
    { PK: `USER#${userId}`, SK: `PROGRAM#${programId}` },
    ...days.map((d: Record<string, unknown>) => ({ PK: `USER#${userId}`, SK: d.SK as string })),
  ]);
  return noContent();
}

async function postDay(userId: string, programId: string, body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = DayBodySchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const dayId = crypto.randomUUID();
  const now = new Date().toISOString();
  const item = { PK: `USER#${userId}`, SK: `PROGRAM#${programId}#DAY#${dayId}`, dayId, programId, ...parsed.data, createdAt: now, updatedAt: now };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return created(stripKeys(item));
}

async function putDay(userId: string, programId: string, dayId: string, body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = DayBodySchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const now = new Date().toISOString();
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: `PROGRAM#${programId}#DAY#${dayId}` },
    UpdateExpression: 'SET #name = :name, #order = :order, exercises = :ex, updatedAt = :now',
    ExpressionAttributeNames: { '#name': 'name', '#order': 'order' },
    ExpressionAttributeValues: { ':name': parsed.data.name, ':order': parsed.data.order, ':ex': parsed.data.exercises, ':now': now },
    ReturnValues: 'ALL_NEW',
  }));
  return ok(stripKeys(Attributes ?? {}));
}

async function deleteDay(userId: string, programId: string, dayId: string): Promise<APIGatewayProxyResultV2> {
  await docClient.send(new DeleteCommand({ TableName: TABLE, Key: { PK: `USER#${userId}`, SK: `PROGRAM#${programId}#DAY#${dayId}` } }));
  return noContent();
}

async function reorderDays(userId: string, programId: string, body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = ReorderSchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const days = await Promise.all(
    parsed.data.dayOrder.map(async (dayId, i) => {
      const { Attributes } = await docClient.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `USER#${userId}`, SK: `PROGRAM#${programId}#DAY#${dayId}` },
        UpdateExpression: 'SET #order = :order, updatedAt = :now',
        ExpressionAttributeNames: { '#order': 'order' },
        ExpressionAttributeValues: { ':order': i, ':now': new Date().toISOString() },
        ReturnValues: 'ALL_NEW',
      }));
      return stripKeys(Attributes ?? {});
    }),
  );
  return ok({ days });
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserId(event);
    const pp = event.pathParameters as Record<string, string> | undefined;
    const { programId = '', dayId = '' } = pp ?? {};
    switch (event.routeKey) {
      case 'GET /api/programs':
        return getPrograms(userId);
      case 'POST /api/programs':
        return postProgram(userId, event.body ?? null);
      case 'GET /api/programs/{programId}':
        return getProgram(userId, programId);
      case 'PUT /api/programs/{programId}':
        return putProgram(userId, programId, event.body ?? null);
      case 'DELETE /api/programs/{programId}':
        return deleteProgram(userId, programId);
      case 'POST /api/programs/{programId}/days/{dayId}':
        return postDay(userId, programId, event.body ?? null);
      case 'PUT /api/programs/{programId}/days/{dayId}':
        return putDay(userId, programId, dayId, event.body ?? null);
      case 'DELETE /api/programs/{programId}/days/{dayId}':
        return deleteDay(userId, programId, dayId);
      case 'PATCH /api/programs/{programId}/days/reorder':
        return reorderDays(userId, programId, event.body ?? null);
      default:
        return notFound('Route not found.');
    }
  } catch {
    return internalError();
  }
};
