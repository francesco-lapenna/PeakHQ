import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import WeeklyLogTable from './WeeklyLogTable';

const mockWeeks = [
  {
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
  },
];

vi.mock('@/lib/api/tracking', () => ({
  useWeeklyLogs: vi.fn(() => ({ data: mockWeeks, isLoading: false })),
  usePutWeeklyLog: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
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

describe('WeeklyLogTable', () => {
  it('renders weekly log rows', async () => {
    render(<WeeklyLogTable />, { wrapper });
    await waitFor(() => expect(screen.getByText('Jun 15')).toBeDefined());
  });

  it('displays lifting days', async () => {
    render(<WeeklyLogTable />, { wrapper });
    await waitFor(() => expect(screen.getByText('4')).toBeDefined());
  });

  it('shows average body weight', async () => {
    render(<WeeklyLogTable />, { wrapper });
    await waitFor(() => expect(screen.getByText('82.5')).toBeDefined());
  });

  it('shows delta BW with sign', async () => {
    render(<WeeklyLogTable />, { wrapper });
    await waitFor(() => expect(screen.getByText('-0.3')).toBeDefined());
  });
});
