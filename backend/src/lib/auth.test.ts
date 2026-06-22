import { describe, expect, it } from 'vitest';
import { makeEvent } from '../test-helpers/event.js';
import { getUserId } from './auth.js';

describe('getUserId', () => {
  it('extracts sub from JWT claims', () => {
    const event = makeEvent({ routeKey: 'GET /api/profile' });
    expect(getUserId(event)).toBe('user-sub-123');
  });

  it('throws when sub claim is missing', () => {
    const event = makeEvent();
    (event.requestContext.authorizer.jwt.claims as Record<string, unknown>)['sub'] = undefined;
    expect(() => getUserId(event)).toThrow('Missing sub claim in JWT');
  });
});
