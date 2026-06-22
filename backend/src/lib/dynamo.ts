import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const TABLE = process.env.TABLE_NAME ?? 'PeakHQ-prod';
