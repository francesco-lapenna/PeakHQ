import type { TokenResponse } from './pkce';

export function setTokens(tokens: TokenResponse): void {
  sessionStorage.setItem('id_token', tokens.id_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
}

export function getIdToken(): string | null {
  return sessionStorage.getItem('id_token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

export function clearTokens(): void {
  sessionStorage.removeItem('id_token');
  localStorage.removeItem('refresh_token');
}
