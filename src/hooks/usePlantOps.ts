import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchPlantOpsInventory,
  fetchPlacements,
  fetchContracts,
  type PlantOpsAssetRow,
  type PlacementRow,
  type RentalContractRow,
} from '@/lib/plantops';

/** Reads the organization type once, used to gate PlantOps UI. */
export function useOrgType() {
  const { profile } = useAuth();
  const [orgType, setOrgType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.org_id) {
      setLoading(false);
      return;
    }
    supabase
      .from('organizations')
      .select('org_type')
      .eq('id', profile.org_id)
      .single()
      .then(({ data }) => {
        setOrgType(((data as any)?.org_type as string) || 'residential');
        setLoading(false);
      });
  }, [profile?.org_id]);

  return { orgType, isPlantRental: orgType === 'plant_rental', loading, orgId: profile?.org_id ?? null };
}

export function usePlantOpsData() {
  const { profile } = useAuth();
  const orgId = profile?.org_id ?? null;

  const [inventory, setInventory] = useState<PlantOpsAssetRow[]>([]);
  const [placements, setPlacements] = useState<PlacementRow[]>([]);
  const [contracts, setContracts] = useState<RentalContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [inv, plc, ctr] = await Promise.all([
        fetchPlantOpsInventory(orgId),
        fetchPlacements(orgId),
        fetchContracts(orgId),
      ]);
      setInventory(inv);
      setPlacements(plc);
      setContracts(ctr);
    } catch (e: any) {
      setError(e?.message || 'Error loading PlantOps data');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { orgId, inventory, placements, contracts, loading, error, refetch };
}
