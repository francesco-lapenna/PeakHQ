import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { getUserId } from '../lib/auth.js';
import { docClient, TABLE } from '../lib/dynamo.js';
import { badRequest, conflict, created, internalError, noContent, notFound, ok } from '../lib/response.js';

const ExerciseBodySchema = z.object({
  name: z.string().min(1),
  primaryMuscles: z.array(z.string()),
  movementPattern: z.string().min(1),
  techniqueTags: z.array(z.string()),
});

function stripKeys(item: Record<string, unknown>) {
  const { PK, SK, ...rest } = item;
  return rest;
}

async function findExercise(userId: string, exerciseId: string) {
  const [{ Item: custom }, { Item: library }] = await Promise.all([
    docClient.send(new GetCommand({ TableName: TABLE, Key: { PK: `USER#${userId}`, SK: `EXERCISE#${exerciseId}` } })),
    docClient.send(new GetCommand({ TableName: TABLE, Key: { PK: 'EXERCISE_LIBRARY', SK: `EXERCISE#${exerciseId}` } })),
  ]);
  return custom ?? library ?? null;
}

async function getExercises(
  userId: string,
  qs: Record<string, string> | undefined,
): Promise<APIGatewayProxyResultV2> {
  const [{ Items: library = [] }, { Items: custom = [] }] = await Promise.all([
    docClient.send(new QueryCommand({ TableName: TABLE, KeyConditionExpression: 'PK = :pk', ExpressionAttributeValues: { ':pk': 'EXERCISE_LIBRARY' } })),
    docClient.send(new QueryCommand({ TableName: TABLE, KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)', ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'EXERCISE#' } })),
  ]);
  let exercises = [...library, ...custom].map(stripKeys);
  exercises.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const search = qs?.search?.toLowerCase();
  if (search) {
    exercises = exercises.filter((e) => String(e.name).toLowerCase().includes(search));
  }
  return ok({ exercises });
}

async function postExercise(userId: string, body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = ExerciseBodySchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const exerciseId = crypto.randomUUID();
  const now = new Date().toISOString();
  const item = { PK: `USER#${userId}`, SK: `EXERCISE#${exerciseId}`, exerciseId, ...parsed.data, isCustom: true, createdAt: now };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return created(stripKeys(item));
}

async function putExercise(userId: string, exerciseId: string, body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = ExerciseBodySchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const item = await findExercise(userId, exerciseId);
  if (!item) return notFound(`Exercise ${exerciseId} not found.`);
  if (!item.isCustom) return conflict('Cannot modify library exercises.');
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: `EXERCISE#${exerciseId}` },
    UpdateExpression: 'SET #name = :name, primaryMuscles = :pm, movementPattern = :mp, techniqueTags = :tt',
    ExpressionAttributeNames: { '#name': 'name' },
    ExpressionAttributeValues: { ':name': parsed.data.name, ':pm': parsed.data.primaryMuscles, ':mp': parsed.data.movementPattern, ':tt': parsed.data.techniqueTags },
    ReturnValues: 'ALL_NEW',
  }));
  return ok(stripKeys(Attributes ?? {}));
}

async function deleteExercise(userId: string, exerciseId: string): Promise<APIGatewayProxyResultV2> {
  const item = await findExercise(userId, exerciseId);
  if (!item) return notFound(`Exercise ${exerciseId} not found.`);
  if (!item.isCustom) return conflict('Cannot delete library exercises.');

  const { Items: days = [] } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    FilterExpression: 'contains(SK, :day)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'PROGRAM#', ':day': '#DAY#' },
  }));
  const referenced = days.some((d: Record<string, unknown>) =>
    Array.isArray(d.exercises) &&
    (d.exercises as Array<{ exerciseId: string }>).some((e) => e.exerciseId === exerciseId),
  );
  if (referenced) return conflict(`Exercise ${exerciseId} is referenced by a program day.`);

  await docClient.send(new DeleteCommand({ TableName: TABLE, Key: { PK: `USER#${userId}`, SK: `EXERCISE#${exerciseId}` } }));
  return noContent();
}

async function getProgression(userId: string, exerciseId: string): Promise<APIGatewayProxyResultV2> {
  const { Items = [] } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': `USER#${userId}#EXERCISE#${exerciseId}` },
    ScanIndexForward: true,
  }));
  const exerciseName = Items[0]?.exerciseName as string | undefined;
  const sets = Items.map((s: Record<string, unknown>) => ({
    date: s.date,
    sessionId: s.sessionId,
    setNumber: s.setNumber,
    reps: s.reps,
    weight: s.weight ?? null,
    unit: s.unit,
  }));
  return ok({ exerciseId, exerciseName: exerciseName ?? null, sets });
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserId(event);
    const qs = event.queryStringParameters as Record<string, string> | undefined;
    const pp = event.pathParameters as Record<string, string> | undefined;
    switch (event.routeKey) {
      case 'GET /api/exercises':
        return getExercises(userId, qs);
      case 'POST /api/exercises':
        return postExercise(userId, event.body ?? null);
      case 'PUT /api/exercises/{exerciseId}':
        return putExercise(userId, pp?.exerciseId ?? '', event.body ?? null);
      case 'DELETE /api/exercises/{exerciseId}':
        return deleteExercise(userId, pp?.exerciseId ?? '');
      case 'GET /api/exercises/{exerciseId}/progression':
        return getProgression(userId, pp?.exerciseId ?? '');
      default:
        return notFound('Route not found.');
    }
  } catch {
    return internalError();
  }
};
