import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE } from './dynamo.js';

export async function batchDelete(keys: Record<string, unknown>[]): Promise<void> {
  if (keys.length === 0) return;
  const chunks: Record<string, unknown>[][] = [];
  for (let i = 0; i < keys.length; i += 25) {
    chunks.push(keys.slice(i, i + 25));
  }
  await Promise.all(
    chunks.map((chunk) =>
      docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE]: chunk.map((Key) => ({ DeleteRequest: { Key } })),
          },
        }),
      ),
    ),
  );
}
