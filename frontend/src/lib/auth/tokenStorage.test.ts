import { beforeEach, describe, expect, it } from 'vitest';
import { clearTokens, getIdToken, getRefreshToken, setTokens } from './tokenStorage';

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('setTokens / getIdToken / getRefreshToken', () => {
  it('stores id_token in sessionStorage and refresh_token in localStorage', () => {
    setTokens({ id_token: 'id-123', refresh_token: 'refresh-456', access_token: 'access-789', expires_in: 3600 });
    expect(sessionStorage.getItem('id_token')).toBe('id-123');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-456');
  });

  it('getIdToken returns the stored id token', () => {
    setTokens({ id_token: 'id-abc', refresh_token: 'r', access_token: 'a', expires_in: 3600 });
    expect(getIdToken()).toBe('id-abc');
  });

  it('getRefreshToken returns the stored refresh token', () => {
    setTokens({ id_token: 'i', refresh_token: 'refresh-xyz', access_token: 'a', expires_in: 3600 });
    expect(getRefreshToken()).toBe('refresh-xyz');
  });

  it('returns null when nothing stored', () => {
    expect(getIdToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});

describe('clearTokens', () => {
  it('removes id_token from sessionStorage and refresh_token from localStorage', () => {
    setTokens({ id_token: 'i', refresh_token: 'r', access_token: 'a', expires_in: 3600 });
    clearTokens();
    expect(getIdToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
