import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import WeeklyLogRow from './WeeklyLogRow';

const mockLog = {
  weekStart: '2026-06-15',
  liftingDays: 4,
  cardioMin: 60,
  stepsAvg: 8500,
  rhr: 52,
  vo2max: 48.5,
  notes: 'Good week',
  kcals: 3500,
  deltaKcals: null,
  avgBW: 82.5,
  deltaBW: -0.3,
  minBW: 82.0,
  maxBW: 83.1,
  bwUnit: 'kg',
};

const mockMutate = vi.fn();

vi.mock('@/lib/api/tracking', () => ({
  usePutWeeklyLog: vi.fn(() => ({ mutate: mockMutate, isPending: false })),
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

describe('WeeklyLogRow', () => {
  it('renders in display mode initially', () => {
    render(<WeeklyLogRow log={mockLog} />, { wrapper });
    expect(screen.getByText('4')).toBeDefined();
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });

  it('enters edit mode on row click', async () => {
    render(<WeeklyLogRow log={mockLog} />, { wrapper });
    await userEvent.click(screen.getByText('4'));
    await waitFor(() => expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0));
  });

  it('calls mutation on save', async () => {
    render(<WeeklyLogRow log={mockLog} />, { wrapper });
    await userEvent.click(screen.getByText('4'));
    await waitFor(() => screen.getAllByRole('spinbutton').length > 0);
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(mockMutate).toHaveBeenCalled());
  });

  it('cancels edit mode without mutation on cancel', async () => {
    render(<WeeklyLogRow log={mockLog} />, { wrapper });
    await userEvent.click(screen.getByText('4'));
    await waitFor(() => screen.getAllByRole('spinbutton').length > 0);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('spinbutton')).toBeNull());
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
