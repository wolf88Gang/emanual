import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEFAULT_MODULES,
  MODULE_LIST,
  moduleForRoute,
  resolveModules,
  type ModuleDefinition,
  type ModuleKey,
  type ModuleRole,
} from '@/lib/homeGuideModules';

/**
 * Enabled modules for the current organization. Reads `organizations.modules_json`
 * and applies it everywhere (navigation, dashboard, route guards) — no hardcoded
 * module lists anywhere else.
 */
export function useModules() {
  const { profile, hasRole, isOwnerOrManager } = useAuth();
  const orgId = profile?.org_id ?? null;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['org-modules', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('modules_json')
        .eq('id', orgId!)
        .single();
      if (error) throw error;
      return resolveModules((data as any)?.modules_json);
    },
  });

  const modules = data ?? DEFAULT_MODULES;

  const save = useMutation({
    mutationFn: async (next: Record<ModuleKey, boolean>) => {
      if (!orgId) throw new Error('No organization');
      const { error } = await supabase
        .from('organizations')
        .update({ modules_json: resolveModules(next) as any })
        .eq('id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Modules change navigation and dashboards immediately.
      queryClient.invalidateQueries({ queryKey: ['org-modules', orgId] });
    },
  });

  const role: ModuleRole = hasRole('crew')
    ? 'crew'
    : hasRole('vendor')
      ? 'vendor'
      : hasRole('client')
        ? 'client'
        : isOwnerOrManager
          ? 'owner'
          : 'client';

  const isEnabled = (key: ModuleKey) => modules[key] === true;

  const canUse = (key: ModuleKey) => {
    const def = MODULE_LIST.find((m) => m.key === key);
    if (!def) return false;
    return isEnabled(key) && def.allowedRoles.includes(role);
  };

  /** Modules with a navigation entry, in canonical order, filtered by role. */
  const navModules: ModuleDefinition[] = MODULE_LIST.filter((m) => m.navRoute && canUse(m.key));

  /** A route is allowed when its owning module is on (unowned routes stay open). */
  const isRouteAllowed = (pathname: string) => {
    const owner = moduleForRoute(pathname);
    if (!owner) return true;
    return canUse(owner.key);
  };

  return {
    modules,
    loading: isLoading,
    role,
    isEnabled,
    canUse,
    navModules,
    isRouteAllowed,
    saveModules: save.mutateAsync,
    saving: save.isPending,
  };
}
