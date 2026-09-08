import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PlatformCheckKey = 'database' | 'session' | 'storage';

export interface PlatformCheck {
  key: PlatformCheckKey;
  ok: boolean;
  /** Raw detail from the backend, or null when the check simply succeeded. */
  error: string | null;
  /** Extra non-error nuance, e.g. no active session. */
  note?: 'no_session';
}

/**
 * Single source of truth for the read-only platform health checks.
 * Used by the System page and by the Console status tile so both cannot drift.
 */
export async function runPlatformChecks(): Promise<PlatformCheck[]> {
  const [database, auth, storage] = await Promise.all([
    supabase.from('organizations').select('id', { count: 'exact', head: true }),
    supabase.auth.getSession(),
    supabase.storage.listBuckets(),
  ]);

  const hasSession = Boolean(auth.data.session) && !auth.error;

  return [
    { key: 'database', ok: !database.error, error: database.error?.message ?? null },
    {
      key: 'session',
      ok: hasSession,
      error: auth.error?.message ?? null,
      note: hasSession ? undefined : 'no_session',
    },
    { key: 'storage', ok: !storage.error, error: storage.error?.message ?? null },
  ];
}

export function usePlatformChecks() {
  const [checks, setChecks] = useState<PlatformCheck[]>([]);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      setChecks(await runPlatformChecks());
    } catch (err) {
      setChecks([
        { key: 'database', ok: false, error: err instanceof Error ? err.message : String(err) },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  const failing = checks.filter((c) => !c.ok);

  return { checks, loading, run, failing, allOk: checks.length > 0 && failing.length === 0 };
}
