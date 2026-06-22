import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import SessionList from './SessionList';

const mockSessions = [
  {
    sessionId: 's1',
    date: '2026-06-22',
    startedAt: '2026-06-22T09:00:00Z',
    endedAt: '2026-06-22T10:00:00Z',
    programDayId: 'd1',
    programId: 'p1',
    notes: null,
    createdAt: '2026-06-22T09:00:00Z',
    updatedAt: '2026-06-22T10:00:00Z',
  },
];

const mockCreateMutate = vi.fn();

vi.mock('@/lib/api/sessions', () => ({
  useSessions: vi.fn(() => ({ data: { sessions: mockSessions, nextCursor: null }, isLoading: false })),
  useCreateSession: vi.fn(() => ({ mutate: mockCreateMutate, isPending: false })),
  useDeleteSession: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('@/lib/api/programs', () => ({
  usePrograms: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/lib/api/profile', () => ({
  useProfile: vi.fn(() => ({ data: { activeProgramId: null } })),
}));

beforeAll(() => {
  vi.stubEnv('VITE_COGNITO_DOMAIN', 'x');
  vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'x');
  vi.stubEnv('VITE_COGNITO_REDIRECT_URI', 'http://localhost:5173/auth/callback');
  vi.stubEnv('VITE_API_BASE_URL', 'https://example.com/api');
});
afterAll(() => vi.unstubAllEnvs());
afterEach(() => vi.clearAllMocks());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/*', element: <QueryClientProvider client={qc}>{children}</QueryClientProvider> }]);
  return <RouterProvider router={router} />;
}

describe('SessionList', () => {
  it('renders sessions', async () => {
    render(<SessionList />, { wrapper });
    await waitFor(() => expect(screen.getByText('2026-06-22')).toBeDefined());
  });

  it('opens start session dialog', async () => {
    render(<SessionList />, { wrapper });
    await waitFor(() => screen.getByText('Start session'));
    await userEvent.click(screen.getByText('Start session'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());
  });
});
