import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface SubscriptionState {
  status: 'loading' | 'trial' | 'active' | 'expired' | 'none';
  trialDaysLeft: number;
  trialEndsAt: Date | null;
  isPaid: boolean;
  isTrial: boolean;
  isExpired: boolean;
  canAccessFeature: (feature: TrialFeature) => boolean;
  assetLimit: number | null; // null = unlimited
  propertyLimit: number; // how many properties the organization can have
  paidPropertyCount: number; // how many properties are paid for
  pricePerProperty: number;
  /** False for internal platform admins — no paywall, alerts or gating for them. */
  enforceSubscription: boolean;
  refetch: () => Promise<void>;
}

type TrialFeature = 'reports' | 'pdf_export' | 'unlimited_assets' | 'labor' | 'compost' | 'crm' | 'topography' | 'ai_manual' | 'add_property';

const TRIAL_ASSET_LIMIT = 3;
const TRIAL_PROPERTY_LIMIT = 1;
const TRIAL_DAYS = 15;
const PRICE_PER_PROPERTY = 20;

// Features blocked during trial
const BLOCKED_IN_TRIAL: TrialFeature[] = [
  'reports', 'pdf_export', 'labor', 'compost', 'crm', 'topography', 'ai_manual', 'unlimited_assets', 'add_property'
];

const SubscriptionContext = createContext<SubscriptionState | undefined>(undefined);
export { SubscriptionContext as SubscriptionContextRaw };

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, profile, isPlatformAdmin } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    status: 'loading',
    trialDaysLeft: 0,
    trialEndsAt: null,
    isPaid: false,
    isTrial: false,
    isExpired: false,
    canAccessFeature: () => true,
    assetLimit: null,
    propertyLimit: TRIAL_PROPERTY_LIMIT,
    paidPropertyCount: 0,
    pricePerProperty: PRICE_PER_PROPERTY,
    enforceSubscription: true,
    refetch: async () => {},
  });

  const fetchSubscription = async () => {
    if (!user) {
      setState(prev => ({ ...prev, status: 'none', enforceSubscription: true }));
      return;
    }

    // Internal platform admins are not a billable tenant: never gate them.
    if (isPlatformAdmin) {
      setState(prev => ({
        ...prev,
        status: 'active',
        isPaid: true,
        isTrial: false,
        isExpired: false,
        canAccessFeature: () => true,
        assetLimit: null,
        propertyLimit: Number.MAX_SAFE_INTEGER,
        enforceSubscription: false,
      }));
      return;
    }

    try {
      // The billable entity is the organization. Fall back to the legacy
      // user linkage only when the profile has no organization yet.
      const query = supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      const { data } = profile?.org_id
        ? await query.eq('org_id', profile.org_id).maybeSingle()
        : await query.eq('user_id', user.id).maybeSingle();

      if (!data) {
        setState(prev => ({
          ...prev,
          status: 'none',
          isPaid: false,
          isTrial: false,
          isExpired: false,
          canAccessFeature: () => false,
          assetLimit: TRIAL_ASSET_LIMIT,
          propertyLimit: TRIAL_PROPERTY_LIMIT,
          paidPropertyCount: 0,
          pricePerProperty: PRICE_PER_PROPERTY,
          enforceSubscription: true,
        }));
        return;
      }

      const isPaid = data.status === 'active' && data.plan_type !== 'trial';
      const isTrial = data.plan_type === 'trial' || !!data.trial_started_at;
      const trialEndsAt = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
      const now = new Date();
      const trialExpired = isTrial && trialEndsAt && now > trialEndsAt;

      const trialDaysLeft = trialEndsAt 
        ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) 
        : 0;

      // Calculate paid property count from amount ($20/property)
      const paidPropertyCount = isPaid ? Math.max(1, Math.floor(data.amount / PRICE_PER_PROPERTY)) : 0;
      const propertyLimit = isPaid ? paidPropertyCount : TRIAL_PROPERTY_LIMIT;

      const canAccessFeature = (feature: TrialFeature): boolean => {
        if (isPaid) return true;
        if (isTrial && !trialExpired) {
          return !BLOCKED_IN_TRIAL.includes(feature);
        }
        return false;
      };

      setState({
        status: isPaid ? 'active' : (isTrial && !trialExpired) ? 'trial' : trialExpired ? 'expired' : 'none',
        trialDaysLeft,
        trialEndsAt,
        isPaid,
        isTrial: isTrial && !trialExpired,
        isExpired: !!trialExpired,
        canAccessFeature,
        assetLimit: isPaid ? null : TRIAL_ASSET_LIMIT,
        propertyLimit,
        paidPropertyCount,
        pricePerProperty: PRICE_PER_PROPERTY,
        enforceSubscription: true,
        refetch: fetchSubscription,
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user, profile?.org_id, isPlatformAdmin]);

  return (
    <SubscriptionContext.Provider value={{ ...state, refetch: fetchSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}

export { TRIAL_ASSET_LIMIT, TRIAL_DAYS, TRIAL_PROPERTY_LIMIT, PRICE_PER_PROPERTY };
