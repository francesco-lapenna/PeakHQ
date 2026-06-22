import { env } from '@/lib/env';

export interface TokenResponse {
  id_token: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

function base64urlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generateCodeVerifier(): string {
  const array = new Uint8Array(48);
  crypto.getRandomValues(array);
  return base64urlEncode(array.buffer);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(hash);
}

export function buildAuthUrl(challenge: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.VITE_COGNITO_CLIENT_ID,
    redirect_uri: env.VITE_COGNITO_REDIRECT_URI,
    scope: 'email openid profile',
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  });
  return `https://${env.VITE_COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string, verifier: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.VITE_COGNITO_CLIENT_ID,
    redirect_uri: env.VITE_COGNITO_REDIRECT_URI,
    code,
    code_verifier: verifier,
  });
  const res = await fetch(`https://${env.VITE_COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description ?? `Token exchange failed: ${res.status}`);
  }
  return res.json() as Promise<TokenResponse>;
}

export function buildLogoutUrl(): string {
  const params = new URLSearchParams({
    client_id: env.VITE_COGNITO_CLIENT_ID,
    logout_uri: new URL(env.VITE_COGNITO_REDIRECT_URI).origin,
  });
  return `https://${env.VITE_COGNITO_DOMAIN}/logout?${params.toString()}`;
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: env.VITE_COGNITO_CLIENT_ID,
    refresh_token: refreshToken,
  });
  const res = await fetch(`https://${env.VITE_COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  return res.json() as Promise<TokenResponse>;
}
