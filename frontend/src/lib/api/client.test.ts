import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from './client';

beforeAll(() => {
  vi.stubEnv('VITE_COGNITO_DOMAIN', 'test.auth.eu-south-1.amazoncognito.com');
  vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');
  vi.stubEnv('VITE_COGNITO_REDIRECT_URI', 'http://localhost:5173/auth/callback');
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/api');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

afterEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('apiFetch', () => {
  it('includes Authorization header when id_token is present in sessionStorage', async () => {
    sessionStorage.setItem('id_token', 'test-jwt-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'ok' }),
    });

    await apiFetch('/profile');

    const [, init] = mockFetch.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer test-jwt-token',
    });
  });

  it('omits Authorization header when no id_token in sessionStorage', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiFetch('/profile');

    const [, init] = mockFetch.mock.calls[0];
    expect((init as RequestInit & { headers: Record<string, string> }).headers?.Authorization).toBeUndefined();
  });

  it('calls the correct URL with VITE_API_BASE_URL prefix', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiFetch('/body-weight');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/body-weight');
  });

  it('throws ApiError with status and code on non-2xx response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: 'not found' } }),
    });

    await expect(apiFetch('/missing')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws ApiError even when response body is not JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    });

    await expect(apiFetch('/crash')).rejects.toBeInstanceOf(ApiError);
  });

  it('returns parsed JSON on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ hello: 'world' }),
    });

    const result = await apiFetch<{ hello: string }>('/test');
    expect(result.hello).toBe('world');
  });
});
