import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getUserId } from '../lib/auth.js';
import { docClient, TABLE } from '../lib/dynamo.js';
import { internalError } from '../lib/response.js';

function q(pk: string, skPrefix: string) {
  return docClient.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': pk, ':prefix': skPrefix },
  })).then(({ Items = [] }) => Items);
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserId(event);
    const qs = event.queryStringParameters as Record<string, string> | undefined;
    const format = qs?.format ?? 'json';

    if (format === 'csv') {
      return {
        statusCode: 501,
        body: JSON.stringify({ error: { code: 'NOT_IMPLEMENTED', message: 'CSV export is not yet supported.' } }),
      };
    }

    const pk = `USER#${userId}`;
    const [
      { Item: profile },
      exercises,
      programs,
      programDays,
      sessions,
      sessionSets,
      mealPlans,
      meals,
      favourites,
      bodyWeightEntries,
      weeklyLogs,
    ] = await Promise.all([
      docClient.send(new GetCommand({ TableName: TABLE, Key: { PK: pk, SK: 'PROFILE' } })),
      q(pk, 'EXERCISE#'),
      q(pk, 'PROGRAM#').then((items) => items.filter((i) => !String(i.SK).includes('#DAY#'))),
      q(pk, 'PROGRAM#').then((items) => items.filter((i) => String(i.SK).includes('#DAY#'))),
      q(pk, 'SESSION#').then((items) => items.filter((i) => !String(i.SK).includes('#SET#'))),
      q(pk, 'SESSION#').then((items) => items.filter((i) => String(i.SK).includes('#SET#'))),
      q(pk, 'MEALPLAN#').then((items) => items.filter((i) => !String(i.SK).includes('#MEAL#'))),
      q(pk, 'MEALPLAN#').then((items) => items.filter((i) => String(i.SK).includes('#MEAL#'))),
      q(pk, 'FAVOURITE#'),
      q(pk, 'BW#'),
      q(pk, 'WEEKLYLOG#'),
    ]);

    const date = new Date().toISOString().slice(0, 10);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="peakhq-export-${date}.json"`,
      },
      body: JSON.stringify({
        exportedAt: new Date().toISOString(),
        profile: profile ?? null,
        exercises,
        programs,
        programDays,
        sessions,
        sessionSets,
        mealPlans,
        meals,
        favourites,
        bodyWeightEntries,
        weeklyLogs,
      }),
    };
  } catch {
    return internalError();
  }
};
