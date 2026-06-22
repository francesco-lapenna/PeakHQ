import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  buildAuthUrl,
  generateCodeChallenge,
  generateCodeVerifier,
} from './pkce';

beforeAll(() => {
  vi.stubEnv('VITE_COGNITO_DOMAIN', 'test.auth.eu-south-1.amazoncognito.com');
  vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');
  vi.stubEnv('VITE_COGNITO_REDIRECT_URI', 'http://localhost:5173/auth/callback');
  vi.stubEnv('VITE_API_BASE_URL', 'https://example.com/api');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('generateCodeVerifier', () => {
  it('returns a string of 43–128 URL-safe characters', () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it('returns a different value each call', () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toBe(b);
  });
});

describe('generateCodeChallenge', () => {
  it('returns a base64url string derived from the verifier', async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(challenge).not.toContain('+');
    expect(challenge).not.toContain('/');
    expect(challenge).not.toContain('=');
  });

  it('returns the same challenge for the same verifier', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const c1 = await generateCodeChallenge(verifier);
    const c2 = await generateCodeChallenge(verifier);
    expect(c1).toBe(c2);
  });
});

describe('buildAuthUrl', () => {
  it('includes required PKCE params', () => {
    const url = buildAuthUrl('test-challenge', 'test-state');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('code_challenge')).toBe('test-challenge');
    expect(parsed.searchParams.get('state')).toBe('test-state');
    expect(parsed.searchParams.get('client_id')).toBe('test-client-id');
  });
});
