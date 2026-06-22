import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/lib/auth/AuthContext';
import ProtectedRoute from './ProtectedRoute';

afterEach(() => {
  vi.clearAllMocks();
});

function makeRouter(isAuthenticated: boolean, isLoading: boolean) {
  return createMemoryRouter([
    {
      path: '/login',
      element: <div>login page</div>,
    },
    {
      element: (
        <AuthContext.Provider
          value={{
            idToken: isAuthenticated ? 'token' : null,
            isAuthenticated,
            isLoading,
            login: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <ProtectedRoute />
        </AuthContext.Provider>
      ),
      children: [{ path: '/', element: <div>protected content</div> }],
    },
  ]);
}

describe('ProtectedRoute', () => {
  it('renders protected content when authenticated', async () => {
    const router = makeRouter(true, false);
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(screen.getByText('protected content')).toBeDefined());
  });

  it('redirects to /login when not authenticated', async () => {
    const router = makeRouter(false, false);
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(screen.getByText('login page')).toBeDefined());
  });

  it('shows loading spinner while auth state is loading', async () => {
    const router = makeRouter(false, true);
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(screen.getByRole('status')).toBeDefined());
  });
});
