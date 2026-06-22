import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { getUserId } from '../lib/auth.js';
import { docClient, TABLE } from '../lib/dynamo.js';
import { badRequest, internalError, noContent, notFound, ok } from '../lib/response.js';
import {
  addDays,
  addWeeks,
  computeBwStats,
  getMondayOf,
  isMonday,
} from '../lib/weeklyLogHelpers.js';

const BwSchema = z.object({
  weight: z.number().positive(),
  unit: z.enum(['kg', 'lb']),
});

const WeeklyLogSchema = z.object({
  liftingDays: z.number().int().min(0).max(7).optional(),
  cardioMin: z.number().min(0).optional(),
  stepsAvg: z.number().min(0).optional(),
  rhr: z.number().min(0).optional(),
  vo2max: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// ─── Body Weight ──────────────────────────────────────────────────────────────

async function getBodyWeight(
  userId: string,
  qs: Record<string, string> | undefined,
): Promise<APIGatewayProxyResultV2> {
  const from = qs?.from;
  const to = qs?.to;

  const KeyConditionExpression =
    from && to
      ? 'PK = :pk AND SK BETWEEN :skStart AND :skEnd'
      : 'PK = :pk AND begins_with(SK, :skPrefix)';

  const ExpressionAttributeValues: Record<string, unknown> =
    from && to
      ? { ':pk': `USER#${userId}`, ':skStart': `BW#${from}`, ':skEnd': `BW#${to}` }
      : { ':pk': `USER#${userId}`, ':skPrefix': 'BW#' };

  const { Items = [] } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression,
      ExpressionAttributeValues,
      ScanIndexForward: true,
    }),
  );
  const entries = Items.map(({ date, weight, unit }) => ({ date, weight, unit }));
  return ok({ entries });
}

async function putBodyWeight(
  userId: string,
  date: string,
  body: string | null,
): Promise<APIGatewayProxyResultV2> {
  const parsed = BwSchema.safeParse(body ? JSON.parse(body) : null);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const { weight, unit } = parsed.data;
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: { PK: `USER#${userId}`, SK: `BW#${date}`, date, weight, unit },
    }),
  );
  return ok({ date, weight, unit });
}

async function deleteBodyWeight(userId: string, date: string): Promise<APIGatewayProxyResultV2> {
  await docClient.send(
    new DeleteCommand({ TableName: TABLE, Key: { PK: `USER#${userId}`, SK: `BW#${date}` } }),
  );
  return noContent();
}

// ─── Weekly Logs ──────────────────────────────────────────────────────────────

async function getWeeklyLogs(
  userId: string,
  qs: Record<string, string> | undefined,
): Promise<APIGatewayProxyResultV2> {
  const today = getMondayOf(new Date());
  const from = qs?.from ?? addWeeks(today, -12);
  const to = qs?.to ?? today;

  const [{ Items: logItems = [] }, { Items: bwItems = [] }, { Item: profile }] =
    await Promise.all([
      docClient.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND SK BETWEEN :from AND :to',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':from': `WEEKLYLOG#${from}`,
            ':to': `WEEKLYLOG#${to}`,
          },
          ScanIndexForward: false,
        }),
      ),
      docClient.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND SK BETWEEN :from AND :to',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':from': `BW#${addWeeks(from, -1)}`,
            ':to': `BW#${addDays(to, 6)}`,
          },
          ScanIndexForward: true,
        }),
      ),
      docClient.send(
        new GetCommand({ TableName: TABLE, Key: { PK: `USER#${userId}`, SK: 'PROFILE' } }),
      ),
    ]);

  const bwEntries = bwItems.map((i: Record<string, unknown>) => ({
    date: i.date as string,
    weight: i.weight as number,
    unit: i.unit as string,
  }));

  const kcals = profile?.activeMealPlanId ? null : null;

  const weeks = logItems.map((log: Record<string, unknown>) => {
    const weekStart = log.weekStart as string;
    const { avgBW, minBW, maxBW } = computeBwStats(bwEntries, weekStart);
    const prevWeekStart = addWeeks(weekStart, -1);
    const { avgBW: prevAvgBW } = computeBwStats(bwEntries, prevWeekStart);
    const deltaBW =
      avgBW !== null && prevAvgBW !== null
        ? Math.round((avgBW - prevAvgBW) * 100) / 100
        : null;
    return {
      weekStart,
      liftingDays: log.liftingDays ?? null,
      cardioMin: log.cardioMin ?? null,
      stepsAvg: log.stepsAvg ?? null,
      rhr: log.rhr ?? null,
      vo2max: log.vo2max ?? null,
      notes: log.notes ?? null,
      kcals,
      deltaKcals: null,
      avgBW,
      deltaBW,
      minBW,
      maxBW,
      bwUnit: avgBW !== null ? (bwEntries.find((e) => e.date >= weekStart && e.date <= addDays(weekStart, 6))?.unit ?? null) : null,
    };
  });

  return ok({ weeks });
}

async function putWeeklyLog(
  userId: string,
  weekStart: string,
  body: string | null,
): Promise<APIGatewayProxyResultV2> {
  if (!isMonday(weekStart)) return badRequest('weekStart must be a Monday (YYYY-MM-DD).');
  const parsed = WeeklyLogSchema.safeParse(body ? JSON.parse(body) : {});
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body.');
  const now = new Date().toISOString();
  const item = { PK: `USER#${userId}`, SK: `WEEKLYLOG#${weekStart}`, weekStart, ...parsed.data, updatedAt: now };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  const { PK, SK, ...log } = item;
  return ok(log);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserId(event);
    const qs = event.queryStringParameters as Record<string, string> | undefined;
    const pp = event.pathParameters as Record<string, string> | undefined;
    switch (event.routeKey) {
      case 'GET /api/body-weight':
        return getBodyWeight(userId, qs);
      case 'PUT /api/body-weight/{date}':
        return putBodyWeight(userId, pp?.date ?? '', event.body ?? null);
      case 'DELETE /api/body-weight/{date}':
        return deleteBodyWeight(userId, pp?.date ?? '');
      case 'GET /api/weekly-logs':
        return getWeeklyLogs(userId, qs);
      case 'PUT /api/weekly-logs/{weekStart}':
        return putWeeklyLog(userId, pp?.weekStart ?? '', event.body ?? null);
      default:
        return notFound('Route not found.');
    }
  } catch {
    return internalError();
  }
};
