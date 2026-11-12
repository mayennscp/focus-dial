import Constants from 'expo-constants';

/** A session as the backend stores it. */
export type ApiSession = {
  id: number;
  minutes: number;
  finishedAt: number;
};

export type ApiStats = {
  today: { sessions: number; minutes: number };
  last7Days: { date: string; minutes: number }[];
  streakDays: number;
  total: { sessions: number; minutes: number };
};

const API_PORT = 3000;
const TIMEOUT_MS = 4000;

/**
 * Where the backend lives:
 * 1. EXPO_PUBLIC_API_URL from .env, if set.
 * 2. In development, the same machine that serves the JS bundle. Expo Go on a
 *    phone loads the app from your computer's LAN address, so the API is
 *    reachable on that address too.
 * 3. localhost as a last resort (web, iOS simulator).
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.0.174:8081"
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${API_PORT}`;

  return `http://localhost:${API_PORT}`;
}

export const API_URL = resolveBaseUrl();

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: init.body
        ? { 'Content-Type': 'application/json', ...init.headers }
        : init.headers,
    });
    if (!res.ok)
      throw new Error(`${init.method ?? 'GET'} ${path} failed: ${res.status}`);
    return (res.status === 204 ? undefined : await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  listSessions(from: number) {
    return request<{ sessions: ApiSession[] }>(`/sessions?from=${from}`).then(
      (r) => r.sessions
    );
  },

  createSession(minutes: number, finishedAt: number) {
    return request<ApiSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ minutes, finishedAt }),
    });
  },

  deleteSession(id: number) {
    return request<void>(`/sessions/${id}`, { method: 'DELETE' });
  },

  stats(timeZone: string) {
    return request<ApiStats>(`/stats?tz=${encodeURIComponent(timeZone)}`);
  },
};
