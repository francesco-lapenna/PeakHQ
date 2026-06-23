import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button } from '@/components/ui/button';

export default function ErrorPage() {
  const error = useRouteError();

  let message = 'An unexpected error occurred.';
  if (isRouteErrorResponse(error)) {
    message = error.statusText || String(error.data);
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-8xl font-bold text-muted-foreground/20">!</p>
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">{message}</p>
      <Button asChild>
        <Link to="/">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
