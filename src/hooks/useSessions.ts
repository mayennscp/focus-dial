import { useCallback, useEffect, useState } from 'react';

import type { Session } from '../components/SessionList';
import { api, type ApiSession } from '../lib/api';

export type SyncStatus = 'loading' | 'online' | 'offline';

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const LOCAL_PREFIX = 'local-';

const fromApi = (s: ApiSession): Session => ({
  id: String(s.id),
  minutes: s.minutes,
  finishedAt: s.finishedAt,
});

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * Today's sessions, kept in sync with the backend.
 *
 * Updates are optimistic: a finished session shows up immediately and is
 * replaced by the saved one when the server answers. If the API cannot be
 * reached the app keeps working with local data and reports "offline".
 */
export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [status, setStatus] = useState<SyncStatus>('loading');

  const refreshStats = useCallback(async () => {
    try {
      const stats = await api.stats(TIME_ZONE);
      setStreakDays(stats.streakDays);
      setStatus('online');
    } catch {
      setStatus('offline');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .listSessions(startOfToday())
      .then((list) => {
        if (cancelled) return;
        setSessions(list.map(fromApi));
        setStatus('online');
        refreshStats();
      })
      .catch(() => {
        if (!cancelled) setStatus('offline');
      });
    return () => {
      cancelled = true;
    };
  }, [refreshStats]);

  const add = useCallback(
    async (minutes: number) => {
      const finishedAt = Date.now();
      const localId = `${LOCAL_PREFIX}${finishedAt}`;
      setSessions((prev) => [{ id: localId, minutes, finishedAt }, ...prev]);
      try {
        const saved = await api.createSession(minutes, finishedAt);
        setSessions((prev) =>
          prev.map((s) => (s.id === localId ? fromApi(saved) : s))
        );
        refreshStats();
      } catch {
        setStatus('offline');
      }
    },
    [refreshStats]
  );

  const remove = useCallback(
    async (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      // Sessions created while offline never reached the server.
      if (id.startsWith(LOCAL_PREFIX)) return;
      try {
        await api.deleteSession(Number(id));
        refreshStats();
      } catch {
        setStatus('offline');
      }
    },
    [refreshStats]
  );

  return { sessions, streakDays, status, add, remove };
}
