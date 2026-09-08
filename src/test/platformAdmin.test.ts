import { describe, expect, it, vi, beforeEach } from 'vitest';

const tables: Record<string, any[]> = {
  organizations: [
    { id: 'org-1', name: 'Alpha', org_type: 'landscaper', created_at: '2026-01-01T00:00:00Z' },
    { id: 'org-2', name: 'Beta', org_type: 'ppm', created_at: '2026-02-01T00:00:00Z' },
  ],
  profiles: [
    { id: 'user-1', full_name: 'Ana', email: 'ana@x.com', org_id: 'org-1', created_at: '2026-01-02T00:00:00Z' },
    { id: 'user-2', full_name: 'Bob', email: 'bob@x.com', org_id: 'org-2', created_at: '2026-02-02T00:00:00Z' },
  ],
  subscriptions: [
    { id: 'sub-1', org_id: 'org-1', user_id: 'user-1', status: 'cancelled', plan_type: 'monthly', amount: 99, currency: 'USD', created_at: '2026-01-03T00:00:00Z', current_period_end: null, paypal_capture_id: null, paypal_order_id: null },
    { id: 'sub-2', org_id: null, user_id: 'user-1', status: 'active', plan_type: 'annual', amount: 20, currency: 'USD', created_at: '2026-01-04T00:00:00Z', current_period_end: null, paypal_capture_id: null, paypal_order_id: null },
  ],
  estates: [
    { id: 'est-1', name: 'Villa One', country: 'CR', org_id: 'org-1', created_at: '2026-01-05T00:00:00Z' },
  ],
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const result = { data: tables[table] ?? [], error: null };
      const builder: any = {
        select: () => builder,
        order: () => Promise.resolve(result),
        then: (resolve: any) => Promise.resolve(result).then(resolve),
      };
      return builder;
    },
  },
}));

import { canonicalSubscription, fetchPlatformOrganizations, formatMoney } from '@/lib/platformAdmin';

beforeEach(() => vi.clearAllMocks());

describe('canonicalSubscription', () => {
  const base = { id: 'x', org_id: null, user_id: 'u', plan_type: 'monthly', currency: 'USD', current_period_end: null, paypal_capture_id: null, paypal_order_id: null } as any;

  it('returns null when there are no rows', () => {
    expect(canonicalSubscription([])).toBeNull();
  });

  it('prefers an active subscription over a larger inactive one', () => {
    const picked = canonicalSubscription([
      { ...base, id: 'inactive', status: 'cancelled', amount: 500, created_at: '2026-01-01T00:00:00Z' },
      { ...base, id: 'active', status: 'active', amount: 10, created_at: '2026-01-02T00:00:00Z' },
    ]);
    expect(picked?.id).toBe('active');
  });

  it('breaks ties on amount, then on the oldest row', () => {
    const picked = canonicalSubscription([
      { ...base, id: 'small', status: 'active', amount: 10, created_at: '2026-01-01T00:00:00Z' },
      { ...base, id: 'big-new', status: 'active', amount: 99, created_at: '2026-03-01T00:00:00Z' },
      { ...base, id: 'big-old', status: 'active', amount: 99, created_at: '2026-01-01T00:00:00Z' },
    ]);
    expect(picked?.id).toBe('big-old');
  });
});

describe('fetchPlatformOrganizations', () => {
  it('groups members, sites and the canonical subscription per organization', async () => {
    const orgs = await fetchPlatformOrganizations();
    const alpha = orgs.find((o) => o.id === 'org-1')!;
    const beta = orgs.find((o) => o.id === 'org-2')!;

    expect(alpha.members.map((m) => m.email)).toEqual(['ana@x.com']);
    expect(alpha.estates.map((e) => e.name)).toEqual(['Villa One']);
    // sub-2 has no org_id but belongs to a member of org-1, and it is active.
    expect(alpha.subscription?.id).toBe('sub-2');

    expect(beta.members.map((m) => m.email)).toEqual(['bob@x.com']);
    expect(beta.estates).toEqual([]);
    expect(beta.subscription).toBeNull();
  });
});

describe('formatMoney', () => {
  it('formats USD with cents and CRC without', () => {
    expect(formatMoney(1234.5, 'USD')).toMatch(/1,234\.50/);
    expect(formatMoney(1234.5, 'CRC')).not.toMatch(/\.5/);
  });

  it('treats non-numeric input as zero', () => {
    expect(formatMoney(NaN, 'USD')).toMatch(/0/);
  });
});
