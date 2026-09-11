import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const DEV_BANNER_KEY = 'dev_banner_enabled';

export interface DevBannerOrg {
  id: string;
  name: string;
  dev_banner_override: boolean | null;
}

/** Global default + per-organization override (null override = follow global). */
export async function fetchGlobalDevBanner(): Promise<boolean> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('bool_value')
    .eq('key', DEV_BANNER_KEY)
    .maybeSingle();
  if (error) throw error;
  return data?.bool_value ?? false;
}

export async function fetchOrgDevBannerOverride(orgId: string): Promise<boolean | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('dev_banner_override')
    .eq('id', orgId)
    .maybeSingle();
  if (error) throw error;
  return data?.dev_banner_override ?? null;
}

/** Resolves whether the development notice should be shown for this account. */
export function useDevBannerVisible(orgId: string | null | undefined) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [global, override] = await Promise.all([
          fetchGlobalDevBanner(),
          orgId ? fetchOrgDevBannerOverride(orgId) : Promise.resolve(null),
        ]);
        if (!cancelled) setVisible(override ?? global);
      } catch {
        if (!cancelled) setVisible(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  return visible;
}

/** Admin-side state: global switch plus per-organization overrides. */
export function useDevBannerAdmin() {
  const [globalEnabled, setGlobalEnabled] = useState(false);
  const [orgs, setOrgs] = useState<DevBannerOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [global, orgRes] = await Promise.all([
        fetchGlobalDevBanner(),
        supabase.from('organizations').select('id, name, dev_banner_override').order('name'),
      ]);
      if (orgRes.error) throw orgRes.error;
      setGlobalEnabled(global);
      setOrgs((orgRes.data ?? []) as DevBannerOrg[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setGlobal = useCallback(async (value: boolean) => {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('platform_settings')
      .upsert(
        { key: DEV_BANNER_KEY, bool_value: value, updated_at: new Date().toISOString(), updated_by: auth.user?.id ?? null },
        { onConflict: 'key' },
      );
    if (error) throw error;
    setGlobalEnabled(value);
  }, []);

  const setOrgOverride = useCallback(async (orgId: string, value: boolean | null) => {
    const { error } = await supabase
      .from('organizations')
      .update({ dev_banner_override: value })
      .eq('id', orgId);
    if (error) throw error;
    setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, dev_banner_override: value } : o)));
  }, []);

  return { globalEnabled, orgs, loading, error, reload: load, setGlobal, setOrgOverride };
}
