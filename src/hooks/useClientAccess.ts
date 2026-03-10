import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ClientPermissions {
  can_view_map: boolean;
  can_view_assets: boolean;
  can_view_tasks: boolean;
  can_view_reports: boolean;
  can_view_photos: boolean;
  can_view_documents: boolean;
  can_view_work_hours: boolean;
  can_view_statistics: boolean;
}

const DEFAULT_PERMISSIONS: ClientPermissions = {
  can_view_map: false,
  can_view_assets: false,
  can_view_tasks: false,
  can_view_reports: false,
  can_view_photos: false,
  can_view_documents: false,
  can_view_work_hours: false,
  can_view_statistics: false,
};

export function useClientAccess(estateId?: string) {
  const { user, hasRole } = useAuth();
  const isClient = hasRole('client' as any);
  const [permissions, setPermissions] = useState<ClientPermissions>(DEFAULT_PERMISSIONS);
  const [accessibleEstates, setAccessibleEstates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isClient) {
      setLoading(false);
      return;
    }

    async function fetchAccess() {
      const { data } = await supabase
        .from('client_access')
        .select('*')
        .eq('client_user_id', user!.id);

      if (data && data.length > 0) {
        setAccessibleEstates(data.map((d: any) => d.estate_id));

        // If estateId provided, get permissions for that estate
        const match = estateId 
          ? data.find((d: any) => d.estate_id === estateId) 
          : data[0];
        
        if (match) {
          setPermissions({
            can_view_map: match.can_view_map,
            can_view_assets: match.can_view_assets,
            can_view_tasks: match.can_view_tasks,
            can_view_reports: match.can_view_reports,
            can_view_photos: match.can_view_photos,
            can_view_documents: match.can_view_documents,
            can_view_work_hours: match.can_view_work_hours,
            can_view_statistics: match.can_view_statistics,
          });
        }
      }
      setLoading(false);
    }

    fetchAccess();
  }, [user, isClient, estateId]);

  return { isClient, permissions, accessibleEstates, loading };
}
