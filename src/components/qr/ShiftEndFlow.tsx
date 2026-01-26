import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Loader2,
  LogOut,
  Camera
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEstate } from '@/contexts/EstateContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WorkLogDialog } from './WorkLogDialog';

interface ActiveShift {
  id: string;
  check_in_at: string;
  asset_id: string | null;
  zone_id: string | null;
  assets?: { name: string } | null;
  zones?: { name: string } | null;
}

interface ShiftEndFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function ShiftEndFlow({ open, onOpenChange, onComplete }: ShiftEndFlowProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { currentEstate } = useEstate();
  const { latitude, longitude, hasLocation, getCurrentPosition, loading: geoLoading } = useGeolocation();
  
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [showWorkLog, setShowWorkLog] = useState(false);
  const [endedShiftId, setEndedShiftId] = useState<string | null>(null);

  useEffect(() => {
    if (open && currentEstate && user) {
      fetchActiveShift();
      getCurrentPosition().catch(() => {});
    }
  }, [open, currentEstate, user]);

  async function fetchActiveShift() {
    if (!currentEstate || !user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('worker_shifts')
        .select(`
          id,
          check_in_at,
          asset_id,
          zone_id,
          assets(name),
          zones(name)
        `)
        .eq('estate_id', currentEstate.id)
        .eq('user_id', user.id)
        .is('check_out_at', null)
        .order('check_in_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setActiveShift(data);
    } catch (err) {
      console.error('Error fetching active shift:', err);
      toast.error(language === 'es' ? 'Error al cargar jornada' : 'Failed to load shift');
    } finally {
      setLoading(false);
    }
  }

  async function handleEndShift() {
    if (!activeShift || !hasLocation) {
      toast.error(language === 'es' ? 'Se requiere ubicación GPS' : 'GPS location required');
      return;
    }

    setEnding(true);
    try {
      const { error } = await supabase
        .from('worker_shifts')
        .update({
          check_out_at: new Date().toISOString(),
          check_out_lat: latitude,
          check_out_lng: longitude,
        })
        .eq('id', activeShift.id);

      if (error) throw error;

      setEndedShiftId(activeShift.id);
      setShowWorkLog(true);
    } catch (err) {
      console.error('Error ending shift:', err);
      toast.error(language === 'es' ? 'Error al finalizar jornada' : 'Failed to end shift');
    } finally {
      setEnding(false);
    }
  }

  function formatDuration(start: string) {
    const diff = Date.now() - new Date(start).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString(language === 'es' ? 'es-CR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (showWorkLog && endedShiftId) {
    return (
      <WorkLogDialog
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            setShowWorkLog(false);
            onComplete();
            onOpenChange(false);
          }
        }}
        shiftId={endedShiftId}
        assetName={activeShift?.assets?.name}
        zoneName={activeShift?.zones?.name}
        onComplete={() => {
          onComplete();
          onOpenChange(false);
        }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <LogOut className="h-5 w-5 text-orange-500" />
            {language === 'es' ? 'Finalizar Jornada' : 'End Shift'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !activeShift ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              {language === 'es' ? 'No hay jornada activa' : 'No active shift'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Shift Summary */}
            <Card className="border-primary bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary">
                    <Clock className="h-4 w-4 animate-pulse" />
                    <span className="font-medium">
                      {language === 'es' ? 'Jornada activa' : 'Active shift'}
                    </span>
                  </div>
                  <span className="text-2xl font-bold">
                    {formatDuration(activeShift.check_in_at)}
                  </span>
                </div>

                <div className="text-sm text-muted-foreground">
                  {language === 'es' ? 'Inicio:' : 'Started:'} {formatTime(activeShift.check_in_at)}
                </div>

                {(activeShift.assets?.name || activeShift.zones?.name) && (
                  <div className="flex gap-2 flex-wrap">
                    {activeShift.assets?.name && (
                      <Badge variant="outline">{activeShift.assets.name}</Badge>
                    )}
                    {activeShift.zones?.name && (
                      <Badge variant="secondary">{activeShift.zones.name}</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GPS Status */}
            <Card className={cn(
              "border-2",
              hasLocation ? "border-green-500 bg-green-500/10" : "border-yellow-500 bg-yellow-500/10"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <MapPin className={cn(
                    "h-5 w-5",
                    hasLocation ? "text-green-500" : "text-yellow-500"
                  )} />
                  <div className="flex-1">
                    {geoLoading ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {language === 'es' ? 'Obteniendo ubicación...' : 'Getting location...'}
                      </div>
                    ) : hasLocation ? (
                      <p className="text-sm text-green-600 font-medium">
                        {language === 'es' ? '✓ Ubicación obtenida' : '✓ Location acquired'}
                      </p>
                    ) : (
                      <p className="text-sm text-yellow-600">
                        {language === 'es' ? 'GPS requerido' : 'GPS required'}
                      </p>
                    )}
                  </div>
                  {!hasLocation && !geoLoading && (
                    <Button size="sm" variant="outline" onClick={() => getCurrentPosition()}>
                      {language === 'es' ? 'Obtener' : 'Get'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Info Notice */}
            <div className="text-sm text-muted-foreground text-center bg-secondary/50 p-3 rounded-lg">
              {language === 'es' 
                ? 'Después de finalizar, deberás registrar el trabajo realizado.'
                : 'After ending, you will need to log the work done.'}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={ending}
          >
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleEndShift}
            disabled={!activeShift || !hasLocation || ending}
            variant="destructive"
            className="gap-2"
          >
            {ending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {language === 'es' ? 'Finalizar y Registrar' : 'End & Log Work'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}