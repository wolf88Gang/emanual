import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  MapPin, 
  Search,
  X,
} from 'lucide-react';
import L from 'leaflet';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
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
import { QRScannerView } from '@/components/map/QRScannerView';
import { ZoneDrawingTool } from '@/components/map/ZoneDrawingTool';
import { AssetCreationDialog } from '@/components/map/AssetCreationDialog';
import { MapActionsMenu } from '@/components/map/MapActionsMenu';
import { toast } from 'sonner';
import type { MapZone, MapAsset } from '@/components/map/types';

type AssetType = 'plant' | 'tree' | 'irrigation_controller' | 'valve' | 'lighting_transformer' | 'hardscape' | 'equipment' | 'structure';

export default function MapView() {
  const { t, language } = useLanguage();
  const { currentEstate } = useEstate();
  const { isOwnerOrManager } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { latitude, longitude, getCurrentPosition, hasLocation, loading: geoLoading } = useGeolocation();
  const mapInstanceRef = useRef<L.Map | null>(null);
  
  const [zones, setZones] = useState<MapZone[]>([]);
  const [assets, setAssets] = useState<MapAsset[]>([]);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<MapAsset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [pinPlacementMode, setPinPlacementMode] = useState(false);
  const [zoneDrawingMode, setZoneDrawingMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // Handle zone selection from URL param
  useEffect(() => {
    const zoneId = searchParams.get('zone');
    if (zoneId && zones.length > 0) {
      const zone = zones.find(z => z.id === zoneId);
      if (zone) {
        setSelectedZone(zone);
      }
    }
  }, [searchParams, zones]);

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

  async function handleMapClick(lat: number, lng: number) {
    if (!pinPlacementMode) return;
    setPendingPin({ lat, lng });
    setShowAddAsset(true);
  }

  function handleAssetCreated() {
    setShowAddAsset(false);
    setPendingPin(null);
    setPinPlacementMode(false);
    fetchMapData();
  }

  async function handleSaveZone(zoneData: {
    name: string;
    color: string;
    geometry_geojson: any;
    purpose_tags: string[];
  }) {
    if (!currentEstate) return;

    try {
      const { error } = await supabase.from('zones').insert([{
        estate_id: currentEstate.id,
        name: zoneData.name,
        color: zoneData.color,
        geometry_geojson: zoneData.geometry_geojson,
        purpose_tags: zoneData.purpose_tags
      }]);

      if (error) throw error;

      toast.success(language === 'es' ? '✅ Zona creada' : '✅ Zone created');
      setZoneDrawingMode(false);
      fetchMapData();
    } catch (error) {
      console.error('Error creating zone:', error);
      toast.error(language === 'es' ? 'Error al crear zona' : 'Failed to create zone');
    }
  }

  async function centerOnCurrentLocation() {
    try {
      await getCurrentPosition();
    } catch (error) {
      toast.error(language === 'es' ? 'No se pudo obtener la ubicación' : 'Could not get location');
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

  const assetTypeLabels: Record<AssetType, { en: string; es: string }> = {
    plant: { en: 'Plant', es: 'Planta' },
    tree: { en: 'Tree', es: 'Árbol' },
    irrigation_controller: { en: 'Irrigation Controller', es: 'Controlador de Riego' },
    valve: { en: 'Valve', es: 'Válvula' },
    lighting_transformer: { en: 'Lighting Transformer', es: 'Transformador de Iluminación' },
    hardscape: { en: 'Hardscape', es: 'Hardscape' },
    equipment: { en: 'Equipment', es: 'Equipo' },
    structure: { en: 'Structure', es: 'Estructura' }
  };

  return (
    <ModernAppLayout>
      <div className="h-[calc(100vh-4rem-4rem)] lg:h-[calc(100vh-3.5rem)] flex flex-col">
        {/* Search Bar - simplified */}
        <div className="p-4 border-b border-border bg-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'es' ? 'Buscar activos...' : 'Search assets...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Pin Placement Mode Indicator */}
        {pinPlacementMode && (
          <div className="px-4 py-2 bg-primary/10 border-b border-primary/30 text-center text-sm">
            <span className="text-primary font-medium">
              {language === 'es' 
                ? '📍 Toca el mapa para colocar un activo' 
                : '📍 Tap on the map to place an asset'}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-2"
              onClick={() => setPinPlacementMode(false)}
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
          </div>
        )}

        {/* Zone Drawing Mode Indicator */}
        {zoneDrawingMode && (
          <div className="px-4 py-2 bg-primary/10 border-b border-primary/30 text-center text-sm">
            <span className="text-primary font-medium">
              {language === 'es' 
                ? '✏️ Dibuja puntos en el mapa para crear una zona' 
                : '✏️ Draw points on the map to create a zone'}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-2"
              onClick={() => setZoneDrawingMode(false)}
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
          </div>
        )}

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
                enablePinPlacement={pinPlacementMode}
                onMapClick={handleMapClick}
                onMapReady={setMapInstance}
              />

              {/* Zone Drawing Tool */}
              {zoneDrawingMode && (
                <ZoneDrawingTool
                  mapRef={mapInstance}
                  onSaveZone={handleSaveZone}
                  onCancel={() => setZoneDrawingMode(false)}
                  isActive={zoneDrawingMode}
                />
              )}

              {/* Asset Creation Dialog */}
              {showAddAsset && pendingPin && currentEstate && (
                <AssetCreationDialog
                  estateId={currentEstate.id}
                  lat={pendingPin.lat}
                  lng={pendingPin.lng}
                  zones={zones}
                  onSave={handleAssetCreated}
                  onCancel={() => {
                    setShowAddAsset(false);
                    setPendingPin(null);
                  }}
                />
              )}

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

              {/* Floating Action Menu */}
              {isOwnerOrManager && (
                <MapActionsMenu
                  onAddAsset={() => {
                    setPinPlacementMode(!pinPlacementMode);
                    setZoneDrawingMode(false);
                  }}
                  onDrawZone={() => {
                    setZoneDrawingMode(!zoneDrawingMode);
                    setPinPlacementMode(false);
                  }}
                  onScanQR={() => setShowQRScanner(true)}
                  onLocateMe={centerOnCurrentLocation}
                  isAddingAsset={pinPlacementMode}
                  isDrawingZone={zoneDrawingMode}
                  locatingDisabled={geoLoading}
                />
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
        {showQRScanner && (
          <QRScannerView 
            onClose={() => setShowQRScanner(false)}
            estateId={currentEstate?.id}
          />
        )}

      </div>
    </ModernAppLayout>
  );
}
