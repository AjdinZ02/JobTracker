import type { User } from '../types';

// Support both VITE_API_URL and VITE_API_BASE for backwards compatibility
const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
const AUTH_BASE = `${API}/auth`;

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

export async function register(email: string, password: string, firstName: string, lastName: string) {
  const res = await fetch(`${AUTH_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName, lastName })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Neuspjela registracija');
  }
  const data = await res.json() as User;
  localStorage.setItem('auth_token', data.token);
  localStorage.setItem('refresh_token', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data));
  return data;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${AUTH_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Neuspješna prijava');
  }
  const data = await res.json() as User;
  localStorage.setItem('auth_token', data.token);
  localStorage.setItem('refresh_token', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data));
  return data;
}

export async function refreshToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    return null;
  }

  try {
    const res = await fetch(`${AUTH_BASE}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!res.ok) {
      // Refresh token invalid - logout user
      logout();
      return null;
    }

    const data = await res.json() as User;
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('refresh_token', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data));
    return data.token;
  } catch (error) {
    console.error('Greška pri refresh tokena:', error);
    logout();
    return null;
  }
}

export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

export function getUser(): User | null {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export async function logout() {
  const token = getToken();
  
  // Notify backend to revoke token
  if (token) {
    try {
      await fetch(`${AUTH_BASE}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token })
      });
    } catch (error) {
      console.error('Greška pri odjavi:', error);
    }
  }
  
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Automatically refresh token when it's about to expire
export async function ensureValidToken(): Promise<string | null> {
  const token = getToken();
  if (!token) return null;

  try {
    // Decode JWT to check expiration (without verification)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // Refresh if token expires in less than 5 minutes
    if (timeUntilExpiry < 5 * 60 * 1000) {
      if (isRefreshing) {
        // Wait for the ongoing refresh to complete
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            resolve(newToken);
          });
        });
      }

      isRefreshing = true;
      const newToken = await refreshToken();
      isRefreshing = false;

      if (newToken) {
        onTokenRefreshed(newToken);
        return newToken;
      }
      return null;
    }

    return token;
  } catch (error) {
    console.error('Greška pri provjeri tokena:', error);
    return token; // Return original token if decoding fails
  }
}
