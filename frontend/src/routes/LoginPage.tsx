import { BarChart2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="flex flex-col items-center gap-2">
        <BarChart2 className="h-12 w-12 text-primary" />
        <h1 className="text-3xl font-bold">PeakHQ</h1>
        <p className="text-muted-foreground">Your personal health dashboard</p>
      </div>
      <Button onClick={login} size="lg">
        Sign in with your account
      </Button>
    </div>
  );
}
