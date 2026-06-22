import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import ProgramList from './ProgramList';

const mockPrograms = [
  {
    programId: 'p1',
    name: 'Push Pull Legs',
    description: '3-day split',
    days: [{ dayId: 'd1', name: 'Push A', order: 0, exercises: [] }],
  },
];

const mockCreateMutate = vi.fn();

vi.mock('@/lib/api/programs', () => ({
  usePrograms: vi.fn(() => ({ data: mockPrograms, isLoading: false })),
  useCreateProgram: vi.fn(() => ({ mutate: mockCreateMutate, isPending: false })),
  useDeleteProgram: vi.fn(() => ({ mutate: vi.fn() })),
  useCreateDay: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateDay: vi.fn(() => ({ mutate: vi.fn() })),
  useDeleteDay: vi.fn(() => ({ mutate: vi.fn() })),
  useReorderDays: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('@/lib/api/profile', () => ({
  useProfile: vi.fn(() => ({ data: { activeProgramId: null } })),
}));

vi.mock('@/lib/api/exercises', () => ({
  useExercises: vi.fn(() => ({ data: [] })),
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
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('ProgramList', () => {
  it('renders programs', async () => {
    render(<ProgramList />, { wrapper });
    await waitFor(() => expect(screen.getByText('Push Pull Legs')).toBeDefined());
  });

  it('expands to show days on click', async () => {
    render(<ProgramList />, { wrapper });
    await waitFor(() => screen.getByText('Push Pull Legs'));
    await userEvent.click(screen.getByText('Push Pull Legs'));
    await waitFor(() => expect(screen.getByText('Push A')).toBeDefined());
  });

  it('opens create dialog on "New program" click', async () => {
    render(<ProgramList />, { wrapper });
    await waitFor(() => screen.getByText('Push Pull Legs'));
    await userEvent.click(screen.getByText('New program'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());
  });
});
