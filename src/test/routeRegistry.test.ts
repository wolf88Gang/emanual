import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEPRECATED_ROUTES, MODULE_LIST, SHELL_ROUTES, routeAccess } from '@/lib/homeGuideModules';

/**
 * Route ownership invariant.
 *
 * Every authenticated tenant route registered in App.tsx must be classified as
 * exactly one of: module-owned, shell/config, or deprecated redirect.
 * A new operational route without ownership fails this test, so no route can
 * silently bypass module configuration.
 */

const APP = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

/** Public / unauthenticated / platform-admin routes are out of scope here. */
const NON_TENANT_ROUTES = [
  '/',
  '/features',
  '/auth',
  '/auth/reset-password',
  '/onboarding',
  '/join-team',
  '/join-client',
  '/platform',
  '/platform/clients',
  '/platform/subscriptions',
  '/platform/payments',
  '/platform/metrics',
  '/platform/system',
  '/jobs',
  '/worker/:id',
  '/c/:token',
  '/cliente/:token',
  '*',
];

const registeredRoutes = Array.from(APP.matchAll(/path="([^"]+)"/g)).map((m) => m[1]);

/** Params are irrelevant for ownership: ownership is by static prefix. */
const staticPath = (p: string) => p.replace(/\/:[^/]+/g, '');

const tenantRoutes = registeredRoutes.filter((p) => !NON_TENANT_ROUTES.includes(p));

describe('tenant route registry', () => {
  it('finds tenant routes in App.tsx', () => {
    expect(tenantRoutes.length).toBeGreaterThan(10);
  });

  it('classifies every tenant route as module-owned, shell or deprecated', () => {
    const uncategorized = tenantRoutes.filter((p) => routeAccess(staticPath(p)).kind === 'unknown');
    expect(uncategorized, `Unowned tenant routes: ${uncategorized.join(', ')}`).toEqual([]);
  });

  it('fails closed for unknown operational routes', () => {
    expect(routeAccess('/some-new-feature').kind).toBe('unknown');
    expect(routeAccess('/labor').kind).toBe('module');
  });

  it('keeps the shell allowlist reachable', () => {
    for (const r of ['/plantops/settings', '/admin', '/requests', '/subscription']) {
      expect(SHELL_ROUTES).toContain(r);
      expect(routeAccess(r).kind).toBe('shell');
    }
  });

  it('redirects deprecated routes to a canonical destination', () => {
    for (const [route, target] of Object.entries(DEPRECATED_ROUTES)) {
      const access = routeAccess(route);
      expect(access.kind).toBe('deprecated');
      expect(access.kind === 'deprecated' && access.redirectTo).toBe(target);
      expect(routeAccess(target).kind).not.toBe('unknown');
    }
  });
});

/**
 * Module surface invariant: every selectable module must be discoverable —
 * either with its own navigation entry, or explicitly documented as embedded
 * inside another module's screen. No toggle may do nothing.
 */
describe('module surfaces', () => {
  const EMBEDDED: Record<string, string> = {
    manuals: 'manual tab inside site detail',
    tools: 'tool assignment inside the visit runner',
    inventory: 'stock inside tools/assets screens',
  };

  it('every module has a navigation route or a documented embedded surface', () => {
    const orphans = MODULE_LIST.filter((m) => !m.navRoute && !EMBEDDED[m.key]).map((m) => m.key);
    expect(orphans, `Modules without any user-facing surface: ${orphans.join(', ')}`).toEqual([]);
  });

  it('every module navigation route is owned by that same module', () => {
    for (const m of MODULE_LIST) {
      if (!m.navRoute) continue;
      const access = routeAccess(m.navRoute);
      expect(access.kind, `${m.key} -> ${m.navRoute}`).toBe('module');
      if (access.kind === 'module') expect(access.module.key).toBe(m.key);
    }
  });

  it('client_portal owns /portals', () => {
    const access = routeAccess('/portals');
    expect(access.kind).toBe('module');
    if (access.kind === 'module') expect(access.module.key).toBe('client_portal');
  });
});
