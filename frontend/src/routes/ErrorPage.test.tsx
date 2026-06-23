import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { expect, test, vi } from 'vitest';

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useRouteError: () => new Error('something exploded') };
});

import ErrorPage from './ErrorPage';

test('renders error heading', () => {
  const router = createMemoryRouter([{ path: '/', element: <ErrorPage /> }]);
  render(<RouterProvider router={router} />);
  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});

test('renders the error message', () => {
  const router = createMemoryRouter([{ path: '/', element: <ErrorPage /> }]);
  render(<RouterProvider router={router} />);
  expect(screen.getByText('something exploded')).toBeInTheDocument();
});
