import type { APIGatewayProxyResultV2 } from 'aws-lambda';

const json = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const err = (code: string, message: string) => ({ error: { code, message } });

export const ok = (body: unknown): APIGatewayProxyResultV2 => json(200, body);
export const created = (body: unknown): APIGatewayProxyResultV2 => json(201, body);
export const noContent = (): APIGatewayProxyResultV2 => ({ statusCode: 204 });
export const notFound = (message: string): APIGatewayProxyResultV2 =>
  json(404, err('RESOURCE_NOT_FOUND', message));
export const badRequest = (message: string): APIGatewayProxyResultV2 =>
  json(400, err('VALIDATION_ERROR', message));
export const conflict = (message: string): APIGatewayProxyResultV2 =>
  json(409, err('CONFLICT', message));
export const internalError = (): APIGatewayProxyResultV2 =>
  json(500, err('INTERNAL_ERROR', 'Unexpected error.'));
