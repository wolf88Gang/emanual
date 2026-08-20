import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DEFAULT_MODULES,
  MODULE_LIST,
  moduleForRoute,
  routeAccess,

  resolveModules,
  type ModuleDefinition,
  type ModuleKey,
  type ModuleRole,
} from '@/lib/homeGuideModules';
import {
  getEntityLabels,
  landingRoute,
  resolveAccountScope,
  resolveArchetype,
  suggestedModuleFlags,
  type AccountScope,
  type BusinessArchetype,
} from '@/lib/businessArchetypes';

/**
 * Enabled modules + account taxonomy for the current organization.
 * Reads `organizations.modules_json`, `business_archetype` and `account_scope`
 * and applies them everywhere (navigation, dashboard, route guards) — no
 * hardcoded module or org-type lists anywhere else.
 */
export function useModules() {
  const { profile, hasRole, isOwnerOrManager } = useAuth();
  const { language } = useLanguage();
  const orgId = profile?.org_id ?? null;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['org-modules', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('modules_json, org_type, business_archetype, account_scope')
        .eq('id', orgId!)
        .single();
      if (error) throw error;
      const row = data as any;
      const archetype = resolveArchetype(row?.business_archetype, row?.org_type);
      const scope = resolveAccountScope(row?.account_scope, archetype);
      // An explicit saved configuration always wins: once the organization has
      // saved modules, the archetype suggestion is never re-applied (a module
      // switched off stays off). Only organizations that never saved a
      // configuration inherit the archetype defaults.
      const saved = row?.modules_json as Record<string, unknown> | null | undefined;
      const hasExplicit = !!saved && typeof saved === 'object' && MODULE_KEYS.some((k) => k in saved);
      const fallback = hasExplicit
        ? (Object.fromEntries(MODULE_KEYS.map((k) => [k, false])) as Record<ModuleKey, boolean>)
        : suggestedModuleFlags(archetype);
      const modules = resolveModules(saved, fallback);
      return { modules, archetype, scope };
    },
  });

  const archetype: BusinessArchetype = data?.archetype ?? 'general_service';
  const scope: AccountScope = data?.scope ?? 'business';
  const modules = data?.modules ?? DEFAULT_MODULES;

  const save = useMutation({
    mutationFn: async (next: Record<ModuleKey, boolean>) => {
      if (!orgId) throw new Error('No organization');
      const { error } = await supabase
        .from('organizations')
        .update({ modules_json: resolveModules(next, next) as any })
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

  /**
   * Fail-closed: shell routes stay open, module routes need their module,
   * deprecated and unknown operational routes are never reachable.
   */
  const isRouteAllowed = (pathname: string) => {
    const access = routeAccess(pathname);
    if (access.kind === 'shell') return true;
    if (access.kind === 'module') return canUse(access.module.key);
    return false;
  };

  /** Canonical destination for a deprecated route, if any. */
  const routeRedirect = (pathname: string) => {
    const access = routeAccess(pathname);
    return access.kind === 'deprecated' ? access.redirectTo : null;
  };


  return {
    modules,
    loading: isLoading,
    role,
    archetype,
    scope,
    isBusiness: scope === 'business',
    isIndividual: scope === 'individual',
    labels: getEntityLabels(archetype, language),
    homeRoute: landingRoute(archetype),
    isEnabled,
    canUse,
    navModules,
    isRouteAllowed,
    routeRedirect,

    saveModules: save.mutateAsync,
    saving: save.isPending,
  };
}
