import { createBrowserRouter, RouterProvider } from 'react-router';
import { AuthProvider } from '@/lib/auth/AuthContext';
import AppShell from '@/components/AppShell';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthCallbackPage from '@/routes/AuthCallbackPage';
import DashboardPage from '@/routes/DashboardPage';
import ErrorPage from '@/routes/ErrorPage';
import LoginPage from '@/routes/LoginPage';
import NotFoundPage from '@/routes/NotFoundPage';
import NutritionPage from '@/routes/NutritionPage';
import SettingsPage from '@/routes/SettingsPage';
import TrainingPage from '@/routes/TrainingPage';
import SessionLoggerPage from '@/features/training/sessions/SessionLoggerPage';

const router = createBrowserRouter([
  {
    errorElement: <ErrorPage />,
    children: [
      { path: '/auth/callback', element: <AuthCallbackPage /> },
      { path: '/login', element: <LoginPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/', element: <DashboardPage /> },
              { path: '/training', element: <TrainingPage /> },
              { path: '/nutrition', element: <NutritionPage /> },
              { path: '/settings', element: <SettingsPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
          { path: '/training/sessions/:sessionId', element: <SessionLoggerPage /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
