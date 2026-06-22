import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

export const TEST_USER_ID = 'user-sub-123';

export function makeEvent(
  overrides: Partial<APIGatewayProxyEventV2WithJWTAuthorizer> & {
    pathParameters?: Record<string, string>;
    queryStringParameters?: Record<string, string>;
    body?: string | null;
  } = {},
): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    version: '2.0',
    routeKey: 'GET /api/profile',
    rawPath: '/api/profile',
    rawQueryString: '',
    headers: {},
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api',
      domainName: 'test.execute-api.eu-south-1.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: 'GET',
        path: '/api/profile',
        protocol: 'HTTP/1.1',
        sourceIp: '1.2.3.4',
        userAgent: 'test',
      },
      requestId: 'test-request-id',
      routeKey: 'GET /api/profile',
      stage: '$default',
      time: '01/Jan/2026:00:00:00 +0000',
      timeEpoch: 1735689600000,
      authorizer: {
        jwt: {
          claims: { sub: TEST_USER_ID },
          scopes: [],
        },
        principalId: TEST_USER_ID,
        integrationLatency: 0,
      },
    },
    isBase64Encoded: false,
    pathParameters: undefined,
    queryStringParameters: undefined,
    body: null,
    ...overrides,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}
