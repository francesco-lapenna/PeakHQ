import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import FoodSearch from './FoodSearch';

const mockAddFav = vi.fn();

vi.mock('@/lib/api/nutrition', () => ({
  useAddFavourite: vi.fn(() => ({ mutate: mockAddFav })),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

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

describe('FoodSearch', () => {
  it('renders search input', () => {
    render(<FoodSearch />, { wrapper });
    expect(screen.getByPlaceholderText(/Open Food Facts/)).toBeDefined();
  });

  it('shows results after searching', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        products: [
          {
            code: '123',
            product_name: 'Nutella',
            nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 },
          },
        ],
      }),
    });

    render(<FoodSearch />, { wrapper });
    await userEvent.type(screen.getByPlaceholderText(/Open Food Facts/), 'nutella');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => expect(screen.getByText('Nutella')).toBeDefined());
  });

  it('clicking star adds to favourites', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        products: [
          {
            code: '123',
            product_name: 'Nutella',
            nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 },
          },
        ],
      }),
    });

    render(<FoodSearch />, { wrapper });
    await userEvent.type(screen.getByPlaceholderText(/Open Food Facts/), 'nutella');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => screen.getByText('Nutella'));
    await userEvent.click(screen.getByTitle('Add to favourites'));

    await waitFor(() => expect(mockAddFav).toHaveBeenCalled());
  });
});
