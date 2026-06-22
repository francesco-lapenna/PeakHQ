import { BarChart2, Dumbbell, Home, LogOut, Settings, Utensils } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from './ui/button';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/training', label: 'Training', icon: Dumbbell },
  { to: '/nutrition', label: 'Nutrition', icon: Utensils },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppShell() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Desktop top bar */}
      <header className="hidden border-b bg-background px-6 py-3 md:flex md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">PeakHQ</span>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 flex border-t bg-background md:hidden">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-xs',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
