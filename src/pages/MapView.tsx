import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Search,
  QrCode,
  X,
  Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AssetTypeIcon } from '@/components/icons/AssetTypeIcon';
import { EstateMap } from '@/components/map/EstateMap';
import { ZoneLegend } from '@/components/map/ZoneLegend';
import type { MapZone, MapAsset } from '@/components/map/types';

export default function MapView() {
  const { t, language } = useLanguage();
  const { currentEstate } = useEstate();
  const navigate = useNavigate();
  const [zones, setZones] = useState<MapZone[]>([]);
  const [assets, setAssets] = useState<MapAsset[]>([]);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<MapAsset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showQRScanner, setShowQRScanner] = useState(false);

  useEffect(() => {
    if (currentEstate) {
      fetchMapData();
    }
  }, [currentEstate]);

  async function fetchMapData() {
    if (!currentEstate) return;
    
    setLoading(true);
    try {
      const [zonesRes, assetsRes] = await Promise.all([
        supabase
          .from('zones')
          .select('*')
          .eq('estate_id', currentEstate.id)
          .order('name'),
        supabase
          .from('assets')
          .select('*, zones:zone_id(*)')
          .eq('estate_id', currentEstate.id)
          .order('name'),
      ]);

      setZones((zonesRes.data || []) as MapZone[]);
      setAssets((assetsRes.data || []).map(a => ({
        ...a,
        zone: a.zones as MapZone | undefined,
      })) as MapAsset[]);
    } catch (error) {
      console.error('Error fetching map data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAssets = assets.filter(asset => {
    if (selectedZone && asset.zone_id !== selectedZone.id) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        asset.name.toLowerCase().includes(query) ||
        asset.asset_type.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Get estate center from first zone or asset with coordinates
  const getMapCenter = (): [number, number] => {
    // Try to get from estate
    if (currentEstate?.lat && currentEstate?.lng) {
      return [currentEstate.lat, currentEstate.lng];
    }
    // Try to get from first asset with coordinates
    const assetWithCoords = assets.find(a => a.lat && a.lng);
    if (assetWithCoords?.lat && assetWithCoords?.lng) {
      return [assetWithCoords.lat, assetWithCoords.lng];
    }
    // Default: Puerto Rico
    return [18.4655, -66.1057];
  };

  return (
    <ModernAppLayout>
      <div className="h-[calc(100vh-4rem-4rem)] lg:h-[calc(100vh-3.5rem)] flex flex-col">
        {/* Search Bar */}
        <div className="p-4 border-b border-border bg-card flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'es' ? 'Buscar activos...' : 'Search assets...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowQRScanner(true)}
            title={language === 'es' ? 'Escanear QR' : 'Scan QR'}
          >
            <QrCode className="h-5 w-5" />
          </Button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground animate-pulse mb-2" />
                <p className="text-muted-foreground">
                  {language === 'es' ? 'Cargando mapa...' : 'Loading map...'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <EstateMap
                zones={zones}
                assets={filteredAssets}
                selectedZone={selectedZone}
                onZoneSelect={setSelectedZone}
                onAssetSelect={setSelectedAsset}
                center={getMapCenter()}
                zoom={17}
              />

              {/* Zone Legend */}
              <ZoneLegend
                zones={zones}
                selectedZone={selectedZone}
                onZoneSelect={setSelectedZone}
                className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] z-[1000]"
              />

              {/* Selected Zone Info */}
              {selectedZone && (
                <div className="absolute top-4 left-4 right-4 z-[1000]">
                  <Card className="bg-card/95 backdrop-blur-sm">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: selectedZone.color || '#10b981' }}
                          />
                          <CardTitle className="text-base">{selectedZone.name}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedZone(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedZone.purpose_tags?.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        <span className="text-sm text-muted-foreground ml-auto">
                          {filteredAssets.length} {language === 'es' ? 'activos' : 'assets'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>

        {/* Asset Detail Sheet */}
        <Sheet open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-auto">
            {selectedAsset && (
              <>
                <SheetHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10'
                    )}>
                      <AssetTypeIcon type={selectedAsset.asset_type as any} size="lg" />
                    </div>
                    <div>
                      <SheetTitle className="font-serif text-xl">
                        {selectedAsset.name}
                      </SheetTitle>
                      <p className="text-sm text-muted-foreground capitalize">
                        {selectedAsset.asset_type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </SheetHeader>

                <div className="space-y-6">
                  {/* Zone */}
                  {selectedAsset.zone && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: selectedAsset.zone.color || '#10b981' }}
                      />
                      <span className="font-medium">{selectedAsset.zone.name}</span>
                    </div>
                  )}

                  {/* Critical Care Note */}
                  {selectedAsset.critical_care_note && (
                    <Card className="border-warning/50 bg-warning/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-warning">
                          {language === 'es' ? 'Nota de Cuidado Crítico' : 'Critical Care Note'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{selectedAsset.critical_care_note}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Purpose Tags */}
                  {(selectedAsset.purpose_tags?.length || 0) > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        {language === 'es' ? 'Propósito' : 'Purpose'}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedAsset.purpose_tags?.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risk Flags */}
                  {(selectedAsset.risk_flags?.length || 0) > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        {language === 'es' ? 'Riesgos' : 'Risk Flags'}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedAsset.risk_flags?.map((flag) => (
                          <Badge key={flag} variant="destructive" className="bg-destructive/10 text-destructive">
                            {flag.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Last Service */}
                  {selectedAsset.last_service_date && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">
                        {language === 'es' ? 'Último Servicio' : 'Last Service'}
                      </h4>
                      <p className="text-muted-foreground">
                        {new Date(selectedAsset.last_service_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <Button 
                      className="flex-1"
                      onClick={() => navigate(`/assets/${selectedAsset.id}`)}
                    >
                      {language === 'es' ? 'Ver Detalles' : 'View Details'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* QR Scanner Sheet */}
        <Sheet open={showQRScanner} onOpenChange={setShowQRScanner}>
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                {language === 'es' ? 'Escanear Código QR' : 'Scan QR Code'}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <QRScannerView 
                onScan={(code) => {
                  setShowQRScanner(false);
                  // QR codes contain asset IDs - navigate to asset detail
                  if (code) {
                    navigate(`/assets/${code}`);
                  }
                }}
                onClose={() => setShowQRScanner(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </ModernAppLayout>
  );
}

// QR Scanner Component
function QRScannerView({ 
  onScan, 
  onClose 
}: { 
  onScan: (code: string) => void; 
  onClose: () => void;
}) {
  const { language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setScanning(true);
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setError(language === 'es' 
          ? 'No se pudo acceder a la cámara. Verifica los permisos.'
          : 'Could not access camera. Please check permissions.');
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [language]);

  // Note: Full QR detection would require a library like @zxing/browser
  // For now, this shows the camera view with manual entry fallback

  return (
    <div className="space-y-4">
      {error ? (
        <div className="text-center py-8">
          <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={onClose}>
            {language === 'es' ? 'Cerrar' : 'Close'}
          </Button>
        </div>
      ) : (
        <>
          <div className="relative aspect-square bg-muted rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-primary rounded-lg">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary animate-pulse" />
                </div>
              </div>
            )}
          </div>
          <p className="text-sm text-center text-muted-foreground">
            {language === 'es' 
              ? 'Apunta la cámara al código QR del activo'
              : 'Point camera at asset QR code'}
          </p>
          
          {/* Manual entry fallback */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">
              {language === 'es' ? 'O ingresa el código manualmente:' : 'Or enter code manually:'}
            </p>
            <div className="flex gap-2">
              <Input 
                placeholder={language === 'es' ? 'Código del activo' : 'Asset code'}
                id="manual-code"
              />
              <Button 
                onClick={() => {
                  const input = document.getElementById('manual-code') as HTMLInputElement;
                  if (input?.value) {
                    onScan(input.value);
                  }
                }}
              >
                {language === 'es' ? 'Ir' : 'Go'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
