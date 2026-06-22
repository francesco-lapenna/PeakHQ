import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { exchangeCode } from '@/lib/auth/pkce';
import { setTokens } from '@/lib/auth/tokenStorage';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code');
      const verifier = sessionStorage.getItem('pkce_verifier');

      if (!code || !verifier) {
        setError('Missing authorization code or PKCE verifier.');
        return;
      }

      try {
        const tokens = await exchangeCode(code, verifier);
        setTokens(tokens);
        sessionStorage.removeItem('pkce_verifier');
        navigate('/', { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed.');
      }
    }

    handleCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg border bg-destructive/10 p-6 text-center">
          <p className="font-semibold text-destructive">Authentication error</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
