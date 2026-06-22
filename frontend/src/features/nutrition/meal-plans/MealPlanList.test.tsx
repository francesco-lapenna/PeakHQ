import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import MealPlanList from './MealPlanList';

const mockPlans = [
  {
    mealPlanId: 'mp1',
    name: 'Bulk 3500 kcal',
    targetKcal: 3500,
    targetProtein: 180,
    targetCarbs: 400,
    targetFat: 100,
    meals: [],
    totals: { kcal: 3200, protein: 160, carbs: 380, fat: 95 },
    deviations: { kcal: -300, protein: -20, carbs: -20, fat: -5 },
  },
];

const mockCreateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('@/lib/api/nutrition', () => ({
  useMealPlans: vi.fn(() => ({ data: mockPlans, isLoading: false })),
  useCreateMealPlan: vi.fn(() => ({ mutate: mockCreateMutate, isPending: false })),
  useDeleteMealPlan: vi.fn(() => ({ mutate: mockDeleteMutate, isPending: false })),
  useMealPlan: vi.fn(() => ({ data: null, isLoading: false })),
  useCreateMeal: vi.fn(() => ({ mutate: vi.fn() })),
  useUpdateMeal: vi.fn(() => ({ mutate: vi.fn() })),
  useDeleteMeal: vi.fn(() => ({ mutate: vi.fn() })),
  useFavourites: vi.fn(() => ({ data: [] })),
  useAddFavourite: vi.fn(() => ({ mutate: vi.fn() })),
  useDeleteFavourite: vi.fn(() => ({ mutate: vi.fn() })),
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

describe('MealPlanList', () => {
  it('renders meal plans', async () => {
    render(<MealPlanList />, { wrapper });
    await waitFor(() => expect(screen.getByText('Bulk 3500 kcal')).toBeDefined());
  });

  it('opens create dialog on button click', async () => {
    render(<MealPlanList />, { wrapper });
    await waitFor(() => screen.getByText('New meal plan'));
    await userEvent.click(screen.getByText('New meal plan'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());
  });
});
