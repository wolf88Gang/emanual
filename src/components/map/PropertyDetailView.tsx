import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Maximize2, ZoomIn, ZoomOut, Layers, List, Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { AssetTypeIcon } from '@/components/icons/AssetTypeIcon';
import type { MapZone, MapAsset } from './types';

// Asset type to emoji/icon mapping
const assetTypeIcons: Record<string, string> = {
  plant: '🌿',
  tree: '🌳',
  irrigation_controller: '💧',
  valve: '🔧',
  lighting_transformer: '💡',
  hardscape: '🪨',
  equipment: '⚙️',
  structure: '🏠',
};

function createAssetIcon(assetType: string, hasRisk: boolean, isSelected: boolean): L.DivIcon {
  const emoji = assetTypeIcons[assetType] || '📍';
  const bgColor = hasRisk ? 'hsl(0, 84%, 60%)' : 'hsl(142, 76%, 36%)';
  const size = isSelected ? 44 : 32;
  
  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${bgColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isSelected ? 22 : 16}px;
        box-shadow: ${isSelected ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.3)'};
        border: ${isSelected ? '3px' : '2px'} solid white;
        transition: all 0.2s;
      ">
        ${emoji}
      </div>
    `,
    className: 'custom-asset-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface PropertyDetailViewProps {
  zones: MapZone[];
  assets: MapAsset[];
  center: [number, number];
  isOpen: boolean;
  onClose: () => void;
  onAssetClick?: (asset: MapAsset) => void;
}

export function PropertyDetailView({
  zones,
  assets,
  center,
  isOpen,
  onClose,
  onAssetClick,
}: PropertyDetailViewProps) {
  const { language } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<MapAsset | null>(null);
  const [isSatellite, setIsSatellite] = useState(true);
  const [showAssetList, setShowAssetList] = useState(false);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const streetTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const satelliteTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;
    
    // Wait for container to be visible
    const timer = setTimeout(() => {
      if (mapRef.current) return;
      
      const map = L.map(mapContainerRef.current!, {
        zoomControl: false,
      }).setView(center, 18);
      
      tileLayerRef.current = L.tileLayer(satelliteTileUrl, {
        attribution: '&copy; Esri',
        maxZoom: 20,
      }).addTo(map);

      mapRef.current = map;
      
      // Force a resize after initialization
      setTimeout(() => map.invalidateSize(), 100);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, center]);

  // Add zones
  useEffect(() => {
    if (!mapRef.current || !isOpen) return;

    const map = mapRef.current;
    
    map.eachLayer((layer) => {
      if ((layer as any)._isZoneLayer) {
        map.removeLayer(layer);
      }
    });

    zones.forEach((zone) => {
      if (zone.geometry_geojson) {
        try {
          const geoJsonLayer = L.geoJSON(zone.geometry_geojson, {
            style: {
              fillColor: zone.color || '#10b981',
              fillOpacity: 0.3,
              color: zone.color || '#10b981',
              weight: 2,
            },
          });

          (geoJsonLayer as any)._isZoneLayer = true;
          geoJsonLayer.bindTooltip(zone.name, {
            permanent: true,
            direction: 'center',
            className: 'zone-label-tooltip',
          });
          geoJsonLayer.addTo(map);
        } catch (e) {
          console.error('Error adding zone:', e);
        }
      }
    });
  }, [zones, isOpen]);

  // Add asset markers
  useEffect(() => {
    if (!mapRef.current || !isOpen) return;

    const map = mapRef.current;
    
    map.eachLayer((layer) => {
      if ((layer as any)._isAssetMarker) {
        map.removeLayer(layer);
      }
    });

    const mappableAssets = assets.filter(a => a.lat !== null && a.lng !== null);
    
    mappableAssets.forEach((asset) => {
      const isSelected = selectedAsset?.id === asset.id;
      const marker = L.marker([asset.lat!, asset.lng!], {
        icon: createAssetIcon(asset.asset_type, (asset.risk_flags?.length || 0) > 0, isSelected),
      });

      (marker as any)._isAssetMarker = true;

      marker.bindTooltip(asset.name, {
        permanent: false,
        direction: 'top',
        offset: [0, -20],
      });

      marker.on('click', () => {
        setSelectedAsset(asset);
        if (onAssetClick) onAssetClick(asset);
      });

      marker.addTo(map);
    });
  }, [assets, selectedAsset, isOpen, onAssetClick]);

  function toggleSatellite() {
    if (!mapRef.current || !tileLayerRef.current) return;
    
    mapRef.current.removeLayer(tileLayerRef.current);
    
    const newUrl = isSatellite ? streetTileUrl : satelliteTileUrl;
    const attribution = isSatellite 
      ? '&copy; OpenStreetMap'
      : '&copy; Esri';
    
    tileLayerRef.current = L.tileLayer(newUrl, { attribution, maxZoom: 20 }).addTo(mapRef.current);
    setIsSatellite(!isSatellite);
  }

  function fitToAllAssets() {
    if (!mapRef.current) return;
    
    const coords = assets
      .filter(a => a.lat && a.lng)
      .map(a => [a.lat!, a.lng!] as [number, number]);
    
    if (coords.length === 0) return;
    
    const bounds = L.latLngBounds(coords);
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  }

  if (!isOpen) return null;

  const assetsByType = assets.reduce((acc, asset) => {
    if (!acc[asset.asset_type]) acc[asset.asset_type] = [];
    acc[asset.asset_type].push(asset);
    return acc;
  }, {} as Record<string, MapAsset[]>);

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card shrink-0">
        <div>
          <h2 className="font-semibold text-lg">
            {language === 'es' ? 'Vista de Propiedad' : 'Property View'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {assets.length} {language === 'es' ? 'activos' : 'assets'} • {zones.length} {language === 'es' ? 'zonas' : 'zones'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAssetList(!showAssetList)}>
            {showAssetList ? <MapIcon className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Map */}
        <div className={cn(
          'transition-all duration-300',
          showAssetList ? 'w-1/2' : 'w-full'
        )}>
          <div ref={mapContainerRef} className="h-full w-full" />
          
          {/* Map Controls */}
          <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
            <Button variant="secondary" size="icon" onClick={() => mapRef.current?.zoomIn()}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={() => mapRef.current?.zoomOut()}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={fitToAllAssets}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={toggleSatellite}>
              <Layers className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Asset List Panel */}
        {showAssetList && (
          <div className="w-1/2 border-l border-border bg-card">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {Object.entries(assetsByType).map(([type, typeAssets]) => (
                  <div key={type}>
                    <h3 className="text-sm font-medium mb-2 capitalize flex items-center gap-2">
                      <span>{assetTypeIcons[type] || '📍'}</span>
                      {type.replace(/_/g, ' ')} ({typeAssets.length})
                    </h3>
                    <div className="space-y-1">
                      {typeAssets.map((asset) => (
                        <button
                          key={asset.id}
                          onClick={() => {
                            setSelectedAsset(asset);
                            if (asset.lat && asset.lng && mapRef.current) {
                              mapRef.current.setView([asset.lat, asset.lng], 19);
                            }
                          }}
                          className={cn(
                            'w-full text-left p-2 rounded-lg transition-colors',
                            'hover:bg-secondary/50',
                            selectedAsset?.id === asset.id && 'bg-primary/10 ring-1 ring-primary'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <AssetTypeIcon type={asset.asset_type as any} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{asset.name}</p>
                              {asset.zone && (
                                <p className="text-xs text-muted-foreground truncate">{asset.zone.name}</p>
                              )}
                            </div>
                            {(asset.risk_flags?.length || 0) > 0 && (
                              <Badge variant="destructive" className="text-xs h-5 bg-destructive/10 text-destructive">
                                ⚠️
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Selected Asset Info */}
      {selectedAsset && (
        <div className="p-3 border-t border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <AssetTypeIcon type={selectedAsset.asset_type as any} size="md" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedAsset.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {selectedAsset.asset_type.replace(/_/g, ' ')}
                {selectedAsset.zone && ` • ${selectedAsset.zone.name}`}
              </p>
            </div>
            <Button 
              size="sm"
              onClick={() => {
                if (onAssetClick) onAssetClick(selectedAsset);
              }}
            >
              {language === 'es' ? 'Ver Detalles' : 'View Details'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
