import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { expect, test } from 'vitest';
import NotFoundPage from './NotFoundPage';

function renderPage() {
  const router = createMemoryRouter([{ path: '/', element: <NotFoundPage /> }]);
  render(<RouterProvider router={router} />);
}

test('renders 404 heading', () => {
  renderPage();
  expect(screen.getByText('Page not found')).toBeInTheDocument();
});

test('renders link back to dashboard', () => {
  renderPage();
  expect(screen.getByRole('link', { name: /go to dashboard/i })).toHaveAttribute('href', '/');
});
