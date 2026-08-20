/**
 * Single source of truth for post-authentication routing.
 *
 * Platform admin (global Home Guide administrator) never needs a tenant org,
 * property, estate, subscription or property onboarding. Owner/manager only
 * administer their own organization.
 */
export interface AuthRoutingInput {
  isPlatformAdmin: boolean;
  orgId?: string | null;
  orgType?: string | null;
  roles?: string[];
}

export function getPostAuthRoute({
  isPlatformAdmin,
  orgId,
  orgType,
  roles = [],
}: AuthRoutingInput): string {
  // Platform admin always wins, even if the same person also owns an org.
  if (isPlatformAdmin) return '/platform';

  if (roles.includes('worker_marketplace')) return '/jobs';

  if (!orgId) return '/onboarding';

  // Every tenant lands on '/', which renders the client-first business home for
  // business accounts and the work view for individual accounts. Module
  // configuration — not org type — decides what is reachable from there.
  return '/';
}


/** True when the tenant home dashboard (WorkView) is the correct landing screen. */
export function landsOnWorkView(input: AuthRoutingInput): boolean {
  return getPostAuthRoute(input) === '/';
}
