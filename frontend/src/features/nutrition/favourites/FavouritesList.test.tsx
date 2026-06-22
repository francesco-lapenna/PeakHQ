import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import FavouritesList from './FavouritesList';

const mockFavourites = [
  {
    offId: '123',
    name: 'Nutella',
    kcalPer100g: 539,
    proteinPer100g: 6.3,
    carbsPer100g: 57.5,
    fatPer100g: 30.9,
    addedAt: '2026-06-22T00:00:00Z',
  },
];

const mockDeleteFav = vi.fn();

vi.mock('@/lib/api/nutrition', () => ({
  useFavourites: vi.fn(() => ({ data: mockFavourites, isLoading: false })),
  useDeleteFavourite: vi.fn(() => ({ mutate: mockDeleteFav })),
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

describe('FavouritesList', () => {
  it('renders favourites', async () => {
    render(<FavouritesList />, { wrapper });
    await waitFor(() => expect(screen.getByText('Nutella')).toBeDefined());
  });

  it('remove calls delete mutation', async () => {
    render(<FavouritesList />, { wrapper });
    await waitFor(() => screen.getByText('Nutella'));
    await userEvent.click(screen.getByTitle('Remove from favourites'));
    await waitFor(() => expect(mockDeleteFav).toHaveBeenCalledWith('123'));
  });
});
