import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEstate } from '@/contexts/EstateContext';
import { toast } from 'sonner';
import type { Currency, RateType } from './types';

export interface EstateRate {
  id: string;
  estate_id: string;
  user_id: string | null; // null means estate default
  rate_type: RateType;
  rate_amount: number;
  currency: Currency;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
}

export function useWorkerRates(language: string) {
  const { currentEstate } = useEstate();
  const [loading, setLoading] = useState(true);
  const [estateDefaultRate, setEstateDefaultRate] = useState<EstateRate | null>(null);
  const [workerRates, setWorkerRates] = useState<EstateRate[]>([]);

  const fetchRates = useCallback(async () => {
    if (!currentEstate) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('worker_rates')
        .select('*')
        .eq('estate_id', currentEstate.id)
        .or(`effective_to.is.null,effective_to.gte.${today}`)
        .lte('effective_from', today)
        .order('effective_from', { ascending: false });

      if (error) throw error;

      const rates = (data || []) as EstateRate[];
      
      // Find estate default (user_id is null)
      const defaultRate = rates.find(r => r.user_id === null);
      setEstateDefaultRate(defaultRate || null);
      
      // Worker-specific rates
      const workerSpecific = rates.filter(r => r.user_id !== null);
      setWorkerRates(workerSpecific);
      
    } catch (error) {
      console.error('Error fetching rates:', error);
    } finally {
      setLoading(false);
    }
  }, [currentEstate]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const saveEstateDefaultRate = async (
    rateType: RateType,
    rateAmount: number,
    currency: Currency
  ) => {
    if (!currentEstate) return;

    try {
      // Close existing default rate
      if (estateDefaultRate) {
        await supabase
          .from('worker_rates')
          .update({ effective_to: new Date().toISOString().split('T')[0] })
          .eq('id', estateDefaultRate.id);
      }

      // Create new default rate
      const { error } = await supabase
        .from('worker_rates')
        .insert({
          estate_id: currentEstate.id,
          user_id: null,
          rate_type: rateType,
          rate_amount: rateAmount,
          currency: currency,
          effective_from: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      toast.success(language === 'es' ? 'Tarifa guardada' : 'Rate saved');
      fetchRates();
    } catch (error) {
      console.error('Error saving rate:', error);
      toast.error(language === 'es' ? 'Error al guardar tarifa' : 'Failed to save rate');
    }
  };

  const saveWorkerRate = async (
    userId: string,
    rateType: RateType,
    rateAmount: number,
    currency: Currency,
    notes?: string
  ) => {
    if (!currentEstate) return;

    try {
      // Close existing rate for this worker
      const existingRate = workerRates.find(r => r.user_id === userId);
      if (existingRate) {
        await supabase
          .from('worker_rates')
          .update({ effective_to: new Date().toISOString().split('T')[0] })
          .eq('id', existingRate.id);
      }

      // Create new rate
      const { error } = await supabase
        .from('worker_rates')
        .insert({
          estate_id: currentEstate.id,
          user_id: userId,
          rate_type: rateType,
          rate_amount: rateAmount,
          currency: currency,
          effective_from: new Date().toISOString().split('T')[0],
          notes: notes || null,
        });

      if (error) throw error;

      toast.success(language === 'es' ? 'Tarifa de trabajador guardada' : 'Worker rate saved');
      fetchRates();
    } catch (error) {
      console.error('Error saving worker rate:', error);
      toast.error(language === 'es' ? 'Error al guardar' : 'Failed to save');
    }
  };

  const getEffectiveRate = (userId: string): EstateRate | null => {
    // Check worker-specific rate first
    const workerRate = workerRates.find(r => r.user_id === userId);
    if (workerRate) return workerRate;
    
    // Fall back to estate default
    return estateDefaultRate;
  };

  const calculatePay = (userId: string, minutes: number): { amount: number; currency: Currency } => {
    const rate = getEffectiveRate(userId);
    
    if (!rate) {
      return { amount: 0, currency: 'USD' };
    }

    let amount: number;
    if (rate.rate_type === 'hourly') {
      amount = (minutes / 60) * rate.rate_amount;
    } else {
      // Daily rate - assume 8 hour day
      amount = (minutes / 480) * rate.rate_amount;
    }

    return { amount, currency: rate.currency as Currency };
  };

  return {
    loading,
    estateDefaultRate,
    workerRates,
    refetch: fetchRates,
    saveEstateDefaultRate,
    saveWorkerRate,
    getEffectiveRate,
    calculatePay,
  };
}
