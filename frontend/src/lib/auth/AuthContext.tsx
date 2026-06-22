import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';
import { buildAuthUrl, buildLogoutUrl, generateCodeChallenge, generateCodeVerifier, refreshTokens } from './pkce';
import { clearTokens, getIdToken, getRefreshToken, setTokens } from './tokenStorage';

interface AuthContextValue {
  idToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  idToken: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function hydrate() {
      const stored = getIdToken();
      if (stored) {
        setIdToken(stored);
        setIsLoading(false);
        return;
      }
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const tokens = await refreshTokens(refreshToken);
          setTokens(tokens);
          setIdToken(tokens.id_token);
        } catch {
          clearTokens();
        }
      }
      setIsLoading(false);
    }
    hydrate();
  }, []);

  const login = useCallback(async () => {
    const verifier = generateCodeVerifier();
    sessionStorage.setItem('pkce_verifier', verifier);
    const state = crypto.randomUUID();
    const challenge = await generateCodeChallenge(verifier);
    const url = buildAuthUrl(challenge, state);
    window.location.assign(url);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setIdToken(null);
    window.location.assign(buildLogoutUrl());
  }, []);

  return (
    <AuthContext.Provider
      value={{ idToken, isAuthenticated: !!idToken, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
