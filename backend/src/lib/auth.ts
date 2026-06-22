import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

export const getUserId = (event: APIGatewayProxyEventV2WithJWTAuthorizer): string => {
  const sub = event.requestContext.authorizer.jwt.claims['sub'];
  if (!sub) throw new Error('Missing sub claim in JWT');
  return sub as string;
};
