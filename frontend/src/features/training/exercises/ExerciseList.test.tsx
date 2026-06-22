import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import ExerciseList from './ExerciseList';

const mockExercises = [
  { exerciseId: 'lib-1', name: 'Bench Press', primaryMuscles: ['Chest'], isCustom: false },
  { exerciseId: 'cus-1', name: 'Cable Fly', primaryMuscles: ['Chest'], isCustom: true },
];

const mockCreateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('@/lib/api/exercises', () => ({
  useExercises: vi.fn(() => ({ data: mockExercises, isLoading: false })),
  useCreateExercise: vi.fn(() => ({ mutate: mockCreateMutate, isPending: false })),
  useUpdateExercise: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteExercise: vi.fn(() => ({ mutate: mockDeleteMutate, isPending: false })),
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

describe('ExerciseList', () => {
  it('renders exercises', async () => {
    render(<ExerciseList />, { wrapper });
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeDefined());
    expect(screen.getByText('Cable Fly')).toBeDefined();
  });

  it('shows no delete button for library exercises', async () => {
    render(<ExerciseList />, { wrapper });
    await waitFor(() => screen.getByText('Bench Press'));
    const items = screen.getAllByRole('listitem');
    const benchPressItem = items.find((el) => el.textContent?.includes('Bench Press'));
    expect(benchPressItem?.querySelector('[data-testid="delete-btn"]')).toBeNull();
  });

  it('shows delete button for custom exercises', async () => {
    render(<ExerciseList />, { wrapper });
    await waitFor(() => screen.getByText('Cable Fly'));
    expect(screen.getByTestId('delete-btn-cus-1')).toBeDefined();
  });
});
