import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEstate } from '@/contexts/EstateContext';
import { startOfWeek, endOfWeek, differenceInMinutes, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { WorkerShift, WorkerSummary, WorkerRate, ShiftValidation, ValidationStatus } from './types';

export function useLaborData(weekStart: Date, language: string) {
  const { currentEstate } = useEstate();
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<WorkerShift[]>([]);
  const [workerSummaries, setWorkerSummaries] = useState<WorkerSummary[]>([]);
  const [rates, setRates] = useState<WorkerRate[]>([]);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const fetchData = useCallback(async () => {
    if (!currentEstate) return;
    
    setLoading(true);
    try {
      // Fetch shifts with user info and validations
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('worker_shifts')
        .select(`
          *,
          user:profiles!worker_shifts_user_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('estate_id', currentEstate.id)
        .gte('check_in_at', weekStart.toISOString())
        .lte('check_in_at', weekEnd.toISOString())
        .order('check_in_at', { ascending: false });

      if (shiftsError) throw shiftsError;

      // Fetch validations for these shifts
      const shiftIds = (shiftsData || []).map(s => s.id);
      let validationsMap = new Map<string, ShiftValidation>();
      
      if (shiftIds.length > 0) {
        const { data: validationsData } = await supabase
          .from('shift_validations')
          .select(`
            *,
            reviewer:profiles!shift_validations_reviewed_by_fkey(full_name, email)
          `)
          .in('shift_id', shiftIds);
        
        if (validationsData) {
          validationsData.forEach(v => {
            validationsMap.set(v.shift_id, v as ShiftValidation);
          });
        }

        // Fetch payments
        const { data: paymentsData } = await supabase
          .from('shift_payments')
          .select('*')
          .in('shift_id', shiftIds);
        
        if (paymentsData) {
          paymentsData.forEach(p => {
            const shift = shiftsData?.find(s => s.id === p.shift_id);
            if (shift) {
              (shift as any).payment = p;
            }
          });
        }
      }

      // Merge validations into shifts
      const enrichedShifts = (shiftsData || []).map(shift => ({
        ...shift,
        validation: validationsMap.get(shift.id),
      })) as WorkerShift[];

      setShifts(enrichedShifts);

      // Build worker summaries
      const summaryMap = new Map<string, WorkerSummary>();
      
      enrichedShifts.forEach(shift => {
        const userId = shift.user_id;
        const userName = shift.user?.full_name || shift.user?.email || 'Unknown';
        const email = shift.user?.email || '';
        const avatarUrl = shift.user?.avatar_url || null;
        
        if (!summaryMap.has(userId)) {
          summaryMap.set(userId, {
            userId,
            userName,
            email,
            avatarUrl,
            shifts: [],
            totalMinutes: 0,
            approvedMinutes: 0,
            pendingMinutes: 0,
            rejectedMinutes: 0,
            paidMinutes: 0,
            totalShifts: 0,
            pendingShifts: 0,
            approvedShifts: 0,
            paidShifts: 0,
          });
        }
        
        const summary = summaryMap.get(userId)!;
        const duration = shift.check_out_at 
          ? differenceInMinutes(parseISO(shift.check_out_at), parseISO(shift.check_in_at))
          : 0;
        
        const status = shift.validation?.status || 'pending';
        const effectiveMinutes = shift.validation?.adjusted_minutes ?? duration;
        
        summary.totalMinutes += duration;
        summary.totalShifts += 1;
        summary.shifts.push(shift);
        
        switch (status) {
          case 'pending':
            summary.pendingMinutes += duration;
            summary.pendingShifts += 1;
            break;
          case 'approved':
            summary.approvedMinutes += effectiveMinutes;
            summary.approvedShifts += 1;
            break;
          case 'adjusted':
            summary.approvedMinutes += effectiveMinutes;
            summary.approvedShifts += 1;
            break;
          case 'rejected':
            summary.rejectedMinutes += duration;
            break;
          case 'paid':
            summary.paidMinutes += effectiveMinutes;
            summary.paidShifts += 1;
            break;
        }
      });

      setWorkerSummaries(Array.from(summaryMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes));

      // Fetch rates
      const { data: ratesData } = await supabase
        .from('worker_rates')
        .select('*')
        .eq('estate_id', currentEstate.id)
        .or(`effective_to.is.null,effective_to.gte.${new Date().toISOString().split('T')[0]}`);
      
      setRates((ratesData || []) as WorkerRate[]);

    } catch (error) {
      console.error('Error fetching labor data:', error);
      toast.error(language === 'es' ? 'Error al cargar datos' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [currentEstate, weekStart, weekEnd, language]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateValidation = async (
    shiftId: string, 
    status: ValidationStatus, 
    decisionType: string | null,
    adjustedMinutes: number | null,
    originalMinutes: number,
    message: string,
    aiMessage: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if validation exists
      const { data: existing } = await supabase
        .from('shift_validations')
        .select('id')
        .eq('shift_id', shiftId)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('shift_validations')
          .update({
            status,
            decision_type: decisionType,
            adjusted_minutes: adjustedMinutes,
            original_minutes: originalMinutes,
            decision_message: message,
            ai_generated_message: aiMessage,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('shift_validations')
          .insert({
            shift_id: shiftId,
            status,
            decision_type: decisionType,
            adjusted_minutes: adjustedMinutes,
            original_minutes: originalMinutes,
            decision_message: message,
            ai_generated_message: aiMessage,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          });
        
        if (error) throw error;
      }

      toast.success(language === 'es' ? 'Validación guardada' : 'Validation saved');
      fetchData();
    } catch (error) {
      console.error('Error updating validation:', error);
      toast.error(language === 'es' ? 'Error al guardar' : 'Failed to save');
    }
  };

  const recordPayment = async (
    shiftId: string,
    validationId: string | null,
    amount: number,
    currency: 'USD' | 'CRC',
    paymentMethod: string,
    paymentDate: string,
    reference: string | null,
    notes: string | null
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('shift_payments')
        .insert({
          shift_id: shiftId,
          validation_id: validationId,
          amount,
          currency,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          reference,
          notes,
          paid_by: user.id,
        });

      if (error) throw error;

      // Update validation status to paid
      if (validationId) {
        await supabase
          .from('shift_validations')
          .update({ status: 'paid' })
          .eq('id', validationId);
      } else {
        // Create validation with paid status
        await supabase
          .from('shift_validations')
          .insert({
            shift_id: shiftId,
            status: 'paid',
            decision_type: 'approval',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          });
      }

      toast.success(language === 'es' ? 'Pago registrado' : 'Payment recorded');
      fetchData();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(language === 'es' ? 'Error al registrar pago' : 'Failed to record payment');
    }
  };

  return {
    loading,
    shifts,
    workerSummaries,
    rates,
    refetch: fetchData,
    updateValidation,
    recordPayment,
  };
}
