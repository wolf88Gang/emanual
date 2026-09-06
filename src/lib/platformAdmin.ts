import { supabase } from '@/integrations/supabase/client';

export interface PlatformSubscription {
  id: string;
  org_id: string | null;
  user_id: string;
  status: string;
  plan_type: string;
  amount: number;
  currency: string;
  created_at: string;
  current_period_end: string | null;
  paypal_capture_id: string | null;
  paypal_order_id: string | null;
}

export interface PlatformOrganization {
  id: string;
  name: string;
  org_type: string;
  created_at: string;
  members: Array<{ id: string; full_name: string | null; email: string; created_at: string }>;
  estates: Array<{ id: string; name: string; country: string | null; created_at: string }>;
  subscription: PlatformSubscription | null;
}

export function canonicalSubscription(rows: PlatformSubscription[]) {
  return [...rows].sort((a, b) => {
    if ((a.status === 'active') !== (b.status === 'active')) return a.status === 'active' ? -1 : 1;
    if (Number(b.amount) !== Number(a.amount)) return Number(b.amount) - Number(a.amount);
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  })[0] ?? null;
}

export async function fetchPlatformOrganizations(): Promise<PlatformOrganization[]> {
  const [orgsRes, profilesRes, subscriptionsRes, estatesRes] = await Promise.all([
    supabase.from('organizations').select('id, name, org_type, created_at').order('name'),
    supabase.from('profiles').select('id, full_name, email, org_id, created_at'),
    supabase.from('subscriptions').select('id, org_id, user_id, status, plan_type, amount, currency, created_at, current_period_end, paypal_capture_id, paypal_order_id'),
    supabase.from('estates').select('id, name, country, org_id, created_at'),
  ]);

  const error = orgsRes.error ?? profilesRes.error ?? subscriptionsRes.error ?? estatesRes.error;
  if (error) throw error;

  const profiles = profilesRes.data ?? [];
  const subscriptions = (subscriptionsRes.data ?? []) as PlatformSubscription[];
  const estates = estatesRes.data ?? [];

  return (orgsRes.data ?? []).map((org) => {
    const members = profiles.filter((profile) => profile.org_id === org.id);
    const memberIds = new Set(members.map((member) => member.id));
    const orgSubscriptions = subscriptions.filter(
      (subscription) => subscription.org_id === org.id || memberIds.has(subscription.user_id),
    );

    return {
      id: org.id,
      name: org.name,
      org_type: org.org_type,
      created_at: org.created_at,
      members: members.map(({ id, full_name, email, created_at }) => ({ id, full_name, email, created_at })),
      estates: estates
        .filter((estate) => estate.org_id === org.id)
        .map(({ id, name, country, created_at }) => ({ id, name, country, created_at })),
      subscription: canonicalSubscription(orgSubscriptions),
    };
  });
}

export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency === 'CRC' ? 'CRC' : 'USD',
    maximumFractionDigits: currency === 'CRC' ? 0 : 2,
  }).format(Number(amount) || 0);
}