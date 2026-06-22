import { render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

beforeAll(() => {
  vi.stubEnv('VITE_COGNITO_DOMAIN', 'test.auth.eu-south-1.amazoncognito.com');
  vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');
  vi.stubEnv('VITE_COGNITO_REDIRECT_URI', 'http://localhost:5173/auth/callback');
  vi.stubEnv('VITE_API_BASE_URL', 'https://example.com/api');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.clearAllMocks();
});

function TestConsumer() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>loading</div>;
  return <div>{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>;
}

describe('AuthProvider', () => {
  it('resolves to unauthenticated when no stored token', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('unauthenticated')).toBeDefined());
  });

  it('becomes authenticated when id_token is in sessionStorage', async () => {
    sessionStorage.setItem('id_token', 'fake.jwt.token');
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('authenticated')).toBeDefined());
  });

  it('login() redirects to Cognito authorize URL', async () => {
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign },
      writable: true,
    });

    function LoginTrigger() {
      const { login } = useAuth();
      return <button onClick={login}>Login</button>;
    }

    render(
      <AuthProvider>
        <LoginTrigger />
      </AuthProvider>,
    );

    screen.getByText('Login').click();

    await waitFor(() => {
      expect(assign).toHaveBeenCalledOnce();
      const url: string = assign.mock.calls[0][0];
      expect(url).toContain('test.auth.eu-south-1.amazoncognito.com');
      expect(url).toContain('response_type=code');
    });
  });
});
