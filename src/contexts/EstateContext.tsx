import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Estate {
  id: string;
  org_id: string;
  name: string;
  country: string | null;
  timezone: string | null;
  address_text: string | null;
  lat: number | null;
  lng: number | null;
  boundary_geojson: unknown;
}

interface EstateContextType {
  estates: Estate[];
  currentEstate: Estate | null;
  setCurrentEstate: (estate: Estate | null) => void;
  loading: boolean;
  refetch: () => Promise<void>;
}

const EstateContext = createContext<EstateContextType | undefined>(undefined);

export function EstateProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [estates, setEstates] = useState<Estate[]>([]);
  const [currentEstate, setCurrentEstate] = useState<Estate | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEstates = async () => {
    if (!user || !profile?.org_id) {
      setEstates([]);
      setCurrentEstate(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('estates')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('name');

      if (error) throw error;

      const estatesData = data as Estate[];
      setEstates(estatesData);

      // Set first estate as current if none selected
      if (!currentEstate && estatesData.length > 0) {
        const savedEstateId = localStorage.getItem('estate-manual-current-estate');
        const savedEstate = estatesData.find(e => e.id === savedEstateId);
        setCurrentEstate(savedEstate || estatesData[0]);
      }
    } catch (error) {
      console.error('Error fetching estates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile?.org_id) {
      fetchEstates();
    } else {
      setLoading(false);
    }
  }, [user, profile?.org_id]);

  useEffect(() => {
    if (currentEstate) {
      localStorage.setItem('estate-manual-current-estate', currentEstate.id);
    }
  }, [currentEstate]);

  return (
    <EstateContext.Provider
      value={{
        estates,
        currentEstate,
        setCurrentEstate,
        loading,
        refetch: fetchEstates,
      }}
    >
      {children}
    </EstateContext.Provider>
  );
}

export function useEstate() {
  const context = useContext(EstateContext);
  if (context === undefined) {
    throw new Error('useEstate must be used within an EstateProvider');
  }
  return context;
}
