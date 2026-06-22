import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import BwEntryCard from './BwEntryCard';

vi.mock('@/lib/api/tracking', () => ({
  useBodyWeight: vi.fn(() => ({
    data: [{ date: '2026-06-22', weight: 82.5, unit: 'kg' }],
    isLoading: false,
  })),
  usePutBodyWeight: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
  })),
  useDeleteBodyWeight: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('@/lib/api/profile', () => ({
  useProfile: vi.fn(() => ({ data: { weightUnit: 'kg' } })),
}));

beforeAll(() => {
  vi.stubEnv('VITE_COGNITO_DOMAIN', 'test.auth.eu-south-1.amazoncognito.com');
  vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');
  vi.stubEnv('VITE_COGNITO_REDIRECT_URI', 'http://localhost:5173/auth/callback');
  vi.stubEnv('VITE_API_BASE_URL', 'https://example.com/api');
});

afterAll(() => vi.unstubAllEnvs());
afterEach(() => vi.clearAllMocks());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('BwEntryCard', () => {
  it('renders recent BW entries', async () => {
    render(<BwEntryCard />, { wrapper });
    await waitFor(() => expect(screen.getByText(/82\.5/)).toBeDefined());
  });

  it('renders the weight input form', () => {
    render(<BwEntryCard />, { wrapper });
    expect(screen.getByRole('spinbutton')).toBeDefined();
  });

  it('calls mutate when form is submitted', async () => {
    const { usePutBodyWeight } = await import('@/lib/api/tracking');
    const mockMutate = vi.fn();
    vi.mocked(usePutBodyWeight).mockReturnValue({ mutate: mockMutate, isPending: false, isError: false } as unknown as ReturnType<typeof usePutBodyWeight>);

    render(<BwEntryCard />, { wrapper });

    const input = screen.getByRole('spinbutton');
    await userEvent.clear(input);
    await userEvent.type(input, '83.0');
    await userEvent.click(screen.getByRole('button', { name: /log/i }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalled());
  });
});
