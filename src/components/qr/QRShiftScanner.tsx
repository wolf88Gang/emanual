import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  ScanLine, 
  Loader2, 
  CheckCircle2, 
  MapPin, 
  AlertTriangle,
  LogIn,
  LogOut,
  User
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEstate } from '@/contexts/EstateContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QRShiftScannerProps {
  onClose: () => void;
  onShiftStarted?: (shiftId: string) => void;
  onShiftEnded?: (shiftId: string) => void;
}

interface QRAssetInfo {
  asset_id: string;
  asset_name: string;
  zone_id: string | null;
  zone_name: string | null;
  lat: number | null;
  lng: number | null;
}

interface ActiveShift {
  id: string;
  check_in_at: string;
  asset_id: string | null;
  zone_id: string | null;
}

type ScanMode = 'check_in' | 'check_out';

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const MAX_DISTANCE_METERS = 150;

export function QRShiftScanner({ onClose, onShiftStarted, onShiftEnded }: QRShiftScannerProps) {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const { currentEstate } = useEstate();
  const navigate = useNavigate();
  const { latitude, longitude, loading: geoLoading, hasLocation, getCurrentPosition } = useGeolocation();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  
  const [scanning, setScanning] = useState(true);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [assetInfo, setAssetInfo] = useState<QRAssetInfo | null>(null);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [gpsValidated, setGpsValidated] = useState(false);
  const [distanceToAsset, setDistanceToAsset] = useState<number | null>(null);
  const [loadingShift, setLoadingShift] = useState(true);

  // Check for active shift on mount
  useEffect(() => {
    if (currentEstate && user) {
      checkActiveShift();
    }
  }, [currentEstate, user]);

  // Auto-request GPS on mount
  useEffect(() => {
    getCurrentPosition().catch(() => {});
  }, []);

  // Validate GPS proximity when we have both asset and user location
  useEffect(() => {
    if (assetInfo?.lat && assetInfo?.lng && hasLocation && latitude && longitude) {
      const distance = calculateDistance(latitude, longitude, assetInfo.lat, assetInfo.lng);
      setDistanceToAsset(Math.round(distance));
      setGpsValidated(distance <= MAX_DISTANCE_METERS);
    }
  }, [assetInfo, hasLocation, latitude, longitude]);

  async function checkActiveShift() {
    if (!currentEstate || !user) return;
    
    setLoadingShift(true);
    try {
      const { data, error } = await supabase
        .from('worker_shifts')
        .select('id, check_in_at, asset_id, zone_id')
        .eq('estate_id', currentEstate.id)
        .eq('user_id', user.id)
        .is('check_out_at', null)
        .order('check_in_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setActiveShift(data);
    } catch (err) {
      console.error('Error checking active shift:', err);
    } finally {
      setLoadingShift(false);
    }
  }

  // Start QR scanner
  useEffect(() => {
    let mounted = true;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    async function startScanning() {
      try {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        await reader.decodeFromVideoDevice(
          undefined,
          videoElement,
          async (result, error) => {
            if (!mounted) return;

            if (result) {
              const code = result.getText();
              setScannedCode(code);
              setScanning(false);
              
              // Look up asset by QR code
              await lookupQRCode(code);
            }
          }
        );
      } catch (err: any) {
        console.error('Error starting scanner:', err);
        setError(err.message || (language === 'es' ? 'Error al acceder a la cámara' : 'Error accessing camera'));
        setScanning(false);
      }
    }

    startScanning();

    return () => {
      mounted = false;
      reader.reset();
    };
  }, [language]);

  async function lookupQRCode(code: string) {
    if (!currentEstate) return;

    try {
      const { data, error: dbError } = await supabase
        .from('qr_labels')
        .select(`
          asset_id,
          assets!inner(
            id,
            name,
            lat,
            lng,
            zone_id,
            zones(id, name)
          )
        `)
        .eq('code', code)
        .eq('estate_id', currentEstate.id)
        .single();

      if (dbError || !data) {
        setError(language === 'es' ? 'Código QR no registrado en esta propiedad' : 'QR code not registered in this property');
        return;
      }

      const asset = data.assets as any;
      setAssetInfo({
        asset_id: asset.id,
        asset_name: asset.name,
        zone_id: asset.zone_id,
        zone_name: asset.zones?.name || null,
        lat: asset.lat,
        lng: asset.lng,
      });
    } catch (err) {
      console.error('Error looking up QR code:', err);
      setError(language === 'es' ? 'Error al buscar código' : 'Error looking up code');
    }
  }

  async function handleCheckIn() {
    if (!currentEstate || !user || !assetInfo || !scannedCode) return;
    
    if (!hasLocation) {
      toast.error(language === 'es' ? 'Se requiere ubicación GPS' : 'GPS location required');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase
        .from('worker_shifts')
        .insert({
          estate_id: currentEstate.id,
          user_id: user.id,
          check_in_lat: latitude,
          check_in_lng: longitude,
          qr_code_in: scannedCode,
          asset_id: assetInfo.asset_id,
          zone_id: assetInfo.zone_id,
          checkin_type: 'self',
          gps_validated: gpsValidated,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success(
        language === 'es' 
          ? `✅ Jornada iniciada en ${assetInfo.asset_name}` 
          : `✅ Shift started at ${assetInfo.asset_name}`
      );
      
      onShiftStarted?.(data.id);
      onClose();
    } catch (err) {
      console.error('Error starting shift:', err);
      toast.error(language === 'es' ? 'Error al iniciar jornada' : 'Failed to start shift');
    } finally {
      setProcessing(false);
    }
  }

  async function handleCheckOut() {
    if (!activeShift || !hasLocation) {
      toast.error(language === 'es' ? 'Se requiere ubicación GPS' : 'GPS location required');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('worker_shifts')
        .update({
          check_out_at: new Date().toISOString(),
          check_out_lat: latitude,
          check_out_lng: longitude,
          qr_code_out: scannedCode,
        })
        .eq('id', activeShift.id);

      if (error) throw error;

      toast.success(language === 'es' ? '✅ Jornada finalizada' : '✅ Shift ended');
      onShiftEnded?.(activeShift.id);
      onClose();
    } catch (err) {
      console.error('Error ending shift:', err);
      toast.error(language === 'es' ? 'Error al finalizar jornada' : 'Failed to end shift');
    } finally {
      setProcessing(false);
    }
  }

  function resetScanner() {
    setScannedCode(null);
    setAssetInfo(null);
    setError(null);
    setGpsValidated(false);
    setDistanceToAsset(null);
    setScanning(true);
  }

  function formatDuration(start: string) {
    const diff = Date.now() - new Date(start).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  const currentMode: ScanMode = activeShift ? 'check_out' : 'check_in';

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentMode === 'check_in' ? (
              <LogIn className="h-5 w-5 text-green-400" />
            ) : (
              <LogOut className="h-5 w-5 text-orange-400" />
            )}
            <h2 className="text-white font-semibold">
              {currentMode === 'check_in' 
                ? (language === 'es' ? 'Iniciar Jornada' : 'Start Shift')
                : (language === 'es' ? 'Finalizar Jornada' : 'End Shift')
              }
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Active Shift Indicator */}
        {activeShift && (
          <div className="mt-3 flex items-center gap-2 bg-orange-500/20 rounded-lg px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-orange-200 text-sm">
              {language === 'es' ? 'Jornada activa:' : 'Active shift:'} {formatDuration(activeShift.check_in_at)}
            </span>
          </div>
        )}
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />

      {/* Scanning Overlay */}
      {scanning && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="w-64 h-64 border-4 border-white/30 rounded-2xl">
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-2xl" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center animate-pulse">
              <ScanLine className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>
      )}

      {/* Scanned Result / Action Panel */}
      {(assetInfo || error) && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/95 to-transparent pt-20">
          <div className="p-4 space-y-4">
            {error ? (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive">{error}</p>
                  </div>
                </CardContent>
              </Card>
            ) : assetInfo && (
              <>
                {/* Asset Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {language === 'es' ? 'QR Identificado' : 'QR Identified'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-semibold text-lg">{assetInfo.asset_name}</p>
                    {assetInfo.zone_name && (
                      <Badge variant="secondary">{assetInfo.zone_name}</Badge>
                    )}
                  </CardContent>
                </Card>

                {/* GPS Validation */}
                <Card className={cn(
                  "border-2",
                  gpsValidated ? "border-green-500 bg-green-500/10" : "border-yellow-500 bg-yellow-500/10"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <MapPin className={cn(
                        "h-5 w-5",
                        gpsValidated ? "text-green-500" : "text-yellow-500"
                      )} />
                      <div className="flex-1">
                        {geoLoading ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {language === 'es' ? 'Verificando ubicación...' : 'Verifying location...'}
                          </div>
                        ) : hasLocation ? (
                          <div>
                            <p className={cn(
                              "font-medium text-sm",
                              gpsValidated ? "text-green-600" : "text-yellow-600"
                            )}>
                              {gpsValidated 
                                ? (language === 'es' ? '✓ Ubicación validada' : '✓ Location validated')
                                : (language === 'es' ? '⚠ Fuera de rango' : '⚠ Out of range')
                              }
                            </p>
                            {distanceToAsset !== null && (
                              <p className="text-xs text-muted-foreground">
                                {language === 'es' ? 'Distancia:' : 'Distance:'} {distanceToAsset}m 
                                {!gpsValidated && ` (${language === 'es' ? 'máx' : 'max'} ${MAX_DISTANCE_METERS}m)`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-yellow-600">
                            {language === 'es' ? 'GPS no disponible' : 'GPS unavailable'}
                          </p>
                        )}
                      </div>
                      {!hasLocation && (
                        <Button size="sm" variant="outline" onClick={() => getCurrentPosition()}>
                          {language === 'es' ? 'Reintentar' : 'Retry'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetScanner} className="flex-1">
                    {language === 'es' ? 'Escanear otro' : 'Scan another'}
                  </Button>
                  
                  {currentMode === 'check_in' ? (
                    <Button 
                      onClick={handleCheckIn}
                      disabled={processing || !hasLocation}
                      className="flex-1 gap-2"
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogIn className="h-4 w-4" />
                      )}
                      {language === 'es' ? 'Iniciar Jornada' : 'Start Shift'}
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleCheckOut}
                      disabled={processing || !hasLocation}
                      variant="destructive"
                      className="flex-1 gap-2"
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                      {language === 'es' ? 'Finalizar Jornada' : 'End Shift'}
                    </Button>
                  )}
                </div>
              </>
            )}

            {error && (
              <Button variant="outline" onClick={resetScanner} className="w-full">
                {language === 'es' ? 'Intentar de nuevo' : 'Try again'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      {scanning && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-center text-sm">
            {language === 'es' 
              ? 'Apunta la cámara al código QR del área de trabajo' 
              : 'Point camera at the work area QR code'}
          </p>
        </div>
      )}
    </div>
  );
}