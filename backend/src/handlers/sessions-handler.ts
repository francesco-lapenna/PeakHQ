import { DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { getUserId } from '../lib/auth.js';
import { batchDelete } from '../lib/batchDelete.js';
import { docClient, TABLE } from '../lib/dynamo.js';
import { badRequest, created, internalError, noContent, notFound, ok } from '../lib/response.js';

const SessionBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  programDayId: z.string().nullable().optional(),
  programId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const SessionPatchSchema = z.object({
  endedAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const SetBodySchema = z.object({
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
  setNumber: z.number().int().min(1),
  reps: z.number().int().min(0),
  weight: z.number().nullable().optional(),
  unit: z.enum(['kg', 'lb']),
});

function stripKeys(item: Record<string, unknown>) {
  const { PK, SK, ...rest } = item;
  return rest;
}

async function findSession(userId: string, sessionId: string) {
  const { Items = [] } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    FilterExpression: 'sessionId = :sid',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'SESSION#', ':sid': sessionId },
  }));
  return Items.find((i: Record<string, unknown>) => !String(i.SK).includes('#SET#')) ?? null;
}

// ─── Sessions list ────────────────────────────────────────────────────────────

async function getSessions(
  userId: string,
  qs: Record<string, string> | undefined,
): Promise<APIGatewayProxyResultV2> {
  const from = qs?.from;
  const to = qs?.to;
  const rawLimit = parseInt(qs?.limit ?? '20', 10);
  const limit = Math.min(isNaN(rawLimit) ? 20 : rawLimit, 100);
  const cursor = qs?.cursor;

  const KeyConditionExpression =
    from && to
      ? 'PK = :pk AND SK BETWEEN :skStart AND :skEnd'
      : 'PK = :pk AND begins_with(SK, :prefix)';

  const ExpressionAttributeValues: Record<string, unknown> =
    from && to
      ? { ':pk': `USER#${userId}`, ':skStart': `SESSION#${from}`, ':skEnd': `SESSION#${to}\xff` }
      : { ':pk': `USER#${userId}`, ':prefix': 'SESSION#' };

  const { Items = [], LastEvaluatedKey } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression,
    FilterExpression: 'NOT contains(SK, :setMarker)',
    ExpressionAttributeValues: { ...ExpressionAttributeValues, ':setMarker': '#SET#' },
    ScanIndexForward: false,
    Limit: limit,
    ...(cursor ? { ExclusiveStartKey: JSON.parse(Buffer.from(cursor, 'base64').toString()) } : {}),
  }));

  const nextCursor = LastEvaluatedKey
    ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64')
    : null;

  return ok({ sessions: Items.map(stripKeys), nextCursor });
}

// ─── Create session ───────────────────────────────────────────────────────────

async function postSession(userId: string, body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = SessionBodySchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();
  const { date } = parsed.data;
  const item = {
    PK: `USER#${userId}`,
    SK: `SESSION#${date}#${sessionId}`,
    sessionId,
    date,
    startedAt: now,
    endedAt: null,
    programDayId: parsed.data.programDayId ?? null,
    programId: parsed.data.programId ?? null,
    notes: parsed.data.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return created(stripKeys(item));
}

// ─── Get single session ───────────────────────────────────────────────────────

async function getSession(userId: string, sessionId: string): Promise<APIGatewayProxyResultV2> {
  const session = await findSession(userId, sessionId);
  if (!session) return notFound(`Session ${sessionId} not found.`);
  const { Items: setItems = [] } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': `SESSION#${sessionId}#SET#` },
  }));
  const sets = setItems.map((s: Record<string, unknown>) => {
    const { PK, SK, GSI1PK, GSI1SK, ...rest } = s;
    return rest;
  });
  return ok({ ...stripKeys(session), sets });
}

// ─── Patch session ────────────────────────────────────────────────────────────

async function patchSession(
  userId: string,
  sessionId: string,
  body: string | null,
): Promise<APIGatewayProxyResultV2> {
  const parsed = SessionPatchSchema.safeParse(body ? JSON.parse(body) : {});
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const session = await findSession(userId, sessionId);
  if (!session) return notFound(`Session ${sessionId} not found.`);
  const now = new Date().toISOString();
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: session.SK as string },
    UpdateExpression: 'SET endedAt = :ea, notes = :notes, updatedAt = :now',
    ExpressionAttributeValues: {
      ':ea': parsed.data.endedAt ?? null,
      ':notes': parsed.data.notes ?? null,
      ':now': now,
    },
    ReturnValues: 'ALL_NEW',
  }));
  return ok(stripKeys(Attributes ?? {}));
}

// ─── Delete session ───────────────────────────────────────────────────────────

async function deleteSession(userId: string, sessionId: string): Promise<APIGatewayProxyResultV2> {
  const session = await findSession(userId, sessionId);
  if (!session) return notFound(`Session ${sessionId} not found.`);
  const { Items: setItems = [] } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': `SESSION#${sessionId}#SET#` },
  }));
  await batchDelete([
    { PK: `USER#${userId}`, SK: session.SK as string },
    ...setItems.map((s: Record<string, unknown>) => ({ PK: `USER#${userId}`, SK: s.SK as string })),
  ]);
  return noContent();
}

// ─── Sets ─────────────────────────────────────────────────────────────────────

async function postSet(
  userId: string,
  sessionId: string,
  body: string | null,
): Promise<APIGatewayProxyResultV2> {
  const parsed = SetBodySchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const session = await findSession(userId, sessionId);
  if (!session) return notFound(`Session ${sessionId} not found.`);
  const setId = crypto.randomUUID();
  const now = new Date().toISOString();
  const date = session.date as string;
  const item = {
    PK: `USER#${userId}`,
    SK: `SESSION#${sessionId}#SET#${setId}`,
    GSI1PK: `USER#${userId}#EXERCISE#${parsed.data.exerciseId}`,
    GSI1SK: `SESSION#${date}#${sessionId}#SET#${setId}`,
    setId,
    sessionId,
    date,
    ...parsed.data,
    weight: parsed.data.weight ?? null,
    createdAt: now,
  };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return created(item);
}

async function putSet(
  userId: string,
  sessionId: string,
  setId: string,
  body: string | null,
): Promise<APIGatewayProxyResultV2> {
  const parsed = SetBodySchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: `SESSION#${sessionId}#SET#${setId}` },
    UpdateExpression: 'SET exerciseId = :eid, exerciseName = :en, setNumber = :sn, reps = :reps, weight = :w, #unit = :unit',
    ExpressionAttributeNames: { '#unit': 'unit' },
    ExpressionAttributeValues: {
      ':eid': parsed.data.exerciseId,
      ':en': parsed.data.exerciseName,
      ':sn': parsed.data.setNumber,
      ':reps': parsed.data.reps,
      ':w': parsed.data.weight ?? null,
      ':unit': parsed.data.unit,
    },
    ReturnValues: 'ALL_NEW',
  }));
  return ok(stripKeys(Attributes ?? {}));
}

async function deleteSet(userId: string, sessionId: string, setId: string): Promise<APIGatewayProxyResultV2> {
  await docClient.send(new DeleteCommand({ TableName: TABLE, Key: { PK: `USER#${userId}`, SK: `SESSION#${sessionId}#SET#${setId}` } }));
  return noContent();
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserId(event);
    const qs = event.queryStringParameters as Record<string, string> | undefined;
    const pp = event.pathParameters as Record<string, string> | undefined;
    const { id: sessionId = '', setId = '' } = pp ?? {};
    switch (event.routeKey) {
      case 'GET /api/sessions':
        return getSessions(userId, qs);
      case 'POST /api/sessions':
        return postSession(userId, event.body ?? null);
      case 'GET /api/sessions/{id}':
        return getSession(userId, sessionId);
      case 'PATCH /api/sessions/{id}':
        return patchSession(userId, sessionId, event.body ?? null);
      case 'DELETE /api/sessions/{id}':
        return deleteSession(userId, sessionId);
      case 'POST /api/sessions/{id}/sets/{setId}':
        return postSet(userId, sessionId, event.body ?? null);
      case 'PUT /api/sessions/{id}/sets/{setId}':
        return putSet(userId, sessionId, setId, event.body ?? null);
      case 'DELETE /api/sessions/{id}/sets/{setId}':
        return deleteSet(userId, sessionId, setId);
      default:
        return notFound('Route not found.');
    }
  } catch {
    return internalError();
  }
};
