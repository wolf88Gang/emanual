import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Layers, Satellite, Map as MapIcon } from 'lucide-react';
import type { MapZone, MapAsset } from './types';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface EstateMapProps {
  zones: MapZone[];
  assets: MapAsset[];
  selectedZone: MapZone | null;
  onZoneSelect: (zone: MapZone | null) => void;
  onAssetSelect: (asset: MapAsset) => void;
  center?: [number, number];
  zoom?: number;
  onMapClick?: (lat: number, lng: number) => void;
  enablePinPlacement?: boolean;
  onMapReady?: (map: L.Map) => void;
}

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

// Create custom marker icon based on asset type and risk
function createAssetIcon(assetType: string, hasRisk: boolean): L.DivIcon {
  const emoji = assetTypeIcons[assetType] || '📍';
  const bgColor = hasRisk ? 'hsl(0, 84%, 60%)' : 'hsl(142, 76%, 36%)';
  
  return L.divIcon({
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: ${bgColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">
        ${emoji}
      </div>
    `,
    className: 'custom-asset-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

export function EstateMap({
  zones,
  assets,
  selectedZone,
  onZoneSelect,
  onAssetSelect,
  center = [9.927138464588024, -84.19285111352922],
  zoom = 17,
  onMapClick,
  enablePinPlacement = false,
  onMapReady,
}: EstateMapProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerClusterRef = useRef<L.MarkerClusterGroup | null>(null);

  // Tile layer URLs
  const streetTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const satelliteTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(center, zoom);
    
    tileLayerRef.current = L.tileLayer(streetTileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;
    setIsMapReady(true);

    // Notify parent of map instance
    if (onMapReady) {
      onMapReady(map);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle map clicks for pin placement
  useEffect(() => {
    if (!mapRef.current) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (enablePinPlacement && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    };

    mapRef.current.on('click', handleMapClick);

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick);
      }
    };
  }, [enablePinPlacement, onMapClick]);

  // Toggle satellite view
  function toggleSatellite() {
    if (!mapRef.current || !tileLayerRef.current) return;
    
    mapRef.current.removeLayer(tileLayerRef.current);
    
    const newUrl = isSatellite ? streetTileUrl : satelliteTileUrl;
    const attribution = isSatellite 
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      : '&copy; <a href="https://www.esri.com/">Esri</a>';
    
    tileLayerRef.current = L.tileLayer(newUrl, { attribution }).addTo(mapRef.current);
    setIsSatellite(!isSatellite);
  }

  // Update center when it changes
  useEffect(() => {
    // Don't auto-recenter if user is interacting with map (prevents jumping)
    // Only recenter when map is first initialized
  }, [center, zoom, isMapReady]);

  // Add zone polygons
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const map = mapRef.current;
    
    // Clear existing zone layers
    map.eachLayer((layer) => {
      if ((layer as any)._isZoneLayer) {
        map.removeLayer(layer);
      }
    });

    // Add zone polygons
    zones.forEach((zone) => {
      if (zone.geometry_geojson) {
        try {
          const geoJsonLayer = L.geoJSON(zone.geometry_geojson, {
            style: {
              fillColor: zone.color || '#10b981',
              fillOpacity: selectedZone?.id === zone.id ? 0.4 : 0.2,
              color: zone.color || '#10b981',
              weight: selectedZone?.id === zone.id ? 3 : 2,
            },
          });

          (geoJsonLayer as any)._isZoneLayer = true;

          geoJsonLayer.on('click', () => {
            onZoneSelect(selectedZone?.id === zone.id ? null : zone);
          });

          geoJsonLayer.bindTooltip(zone.name, {
            permanent: false,
            direction: 'center',
            className: 'zone-tooltip',
          });

          geoJsonLayer.addTo(map);
        } catch (e) {
          console.error('Error adding zone polygon:', e);
        }
      }
    });
  }, [zones, selectedZone, onZoneSelect, isMapReady]);

  // Fit to selected zone
  useEffect(() => {
    if (!mapRef.current || !selectedZone?.geometry_geojson) return;

    try {
      const geoJson = L.geoJSON(selectedZone.geometry_geojson);
      const bounds = geoJson.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (e) {
      console.error('Error fitting to zone bounds:', e);
    }
  }, [selectedZone]);

  // Add asset markers with clustering
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const map = mapRef.current;
    
    // Remove existing cluster group
    if (markerClusterRef.current) {
      map.removeLayer(markerClusterRef.current);
      markerClusterRef.current = null;
    }

    // Create new cluster group with spiderfying for stacked markers
    const clusterGroup = L.markerClusterGroup({
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 40,
      spiderfyDistanceMultiplier: 2,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const hasRisk = cluster.getAllChildMarkers().some(
          (m: any) => m._hasRisk
        );
        const bgColor = hasRisk ? 'hsl(0, 84%, 60%)' : 'hsl(142, 76%, 36%)';
        
        return L.divIcon({
          html: `
            <div style="
              width: 44px;
              height: 44px;
              background: ${bgColor};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              font-weight: 600;
              color: white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              border: 3px solid white;
            ">
              ${count}
            </div>
          `,
          className: 'custom-cluster-marker',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });
      },
    });

    // Add asset markers to cluster group
    const mappableAssets = assets.filter(a => a.lat !== null && a.lng !== null);
    
    mappableAssets.forEach((asset) => {
      const hasRisk = (asset.risk_flags?.length || 0) > 0;
      const marker = L.marker([asset.lat!, asset.lng!], {
        icon: createAssetIcon(asset.asset_type, hasRisk),
      });

      // Store risk flag on marker for cluster icon
      (marker as any)._hasRisk = hasRisk;

      // Hover tooltip with quick info
      const tooltipContent = `
        <div style="font-family: system-ui, sans-serif; padding: 4px 0;">
          <strong style="font-size: 13px; display: block;">${asset.name}</strong>
          <span style="font-size: 11px; color: #666; text-transform: capitalize;">${asset.asset_type.replace('_', ' ')}</span>
          ${asset.zone ? `<br/><span style="font-size: 10px; color: #888;">📍 ${asset.zone.name}</span>` : ''}
          ${hasRisk ? `<br/><span style="font-size: 10px; color: #dc2626;">⚠️ ${language === 'es' ? 'Requiere atención' : 'Needs attention'}</span>` : ''}
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'top',
        offset: [0, -20],
        className: 'asset-tooltip',
      });

      // Click popup with full details
      const popupContent = `
        <div style="min-width: 180px; font-family: system-ui, sans-serif;">
          <h4 style="font-weight: 600; font-size: 14px; margin: 0 0 4px 0;">${asset.name}</h4>
          <p style="font-size: 12px; color: #666; margin: 0 0 8px 0; text-transform: capitalize;">
            ${asset.asset_type.replace('_', ' ')}
          </p>
          ${asset.zone ? `<p style="font-size: 11px; color: #888; margin: 0 0 8px 0;">📍 ${asset.zone.name}</p>` : ''}
          ${asset.critical_care_note ? `
            <p style="font-size: 11px; background: #fef3c7; color: #92400e; padding: 6px; border-radius: 4px; margin: 0 0 8px 0;">
              ⚠️ ${asset.critical_care_note}
            </p>
          ` : ''}
          <button 
            onclick="window.location.href='/assets/${asset.id}'"
            style="
              width: 100%;
              padding: 8px;
              background: hsl(142, 76%, 36%);
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 500;
              cursor: pointer;
            "
          >
            ${language === 'es' ? 'Ver Detalles' : 'View Details'}
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    markerClusterRef.current = clusterGroup;

    return () => {
      if (markerClusterRef.current && mapRef.current) {
        mapRef.current.removeLayer(markerClusterRef.current);
      }
    };
  }, [assets, language, isMapReady]);

  return (
    <div className="relative h-full w-full">
      {/* Custom CSS for marker cluster spiderfy */}
      <style>{`
        .leaflet-marker-icon.custom-asset-marker,
        .leaflet-marker-icon.custom-cluster-marker {
          background: transparent !important;
          border: none !important;
        }
        .marker-cluster {
          background-clip: padding-box;
        }
        .marker-cluster-small,
        .marker-cluster-medium,
        .marker-cluster-large {
          background-color: transparent !important;
        }
        .leaflet-cluster-anim .leaflet-marker-icon {
          transition: transform 0.3s ease-out, opacity 0.3s ease-out;
        }
        /* Spider leg styling */
        .leaflet-cluster-spider-leg {
          stroke: hsl(142, 76%, 36%);
          stroke-width: 2;
          stroke-opacity: 0.7;
        }
        /* Asset tooltip styling */
        .asset-tooltip {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          font-size: 12px;
        }
        .asset-tooltip::before {
          border-top-color: white !important;
        }
        .leaflet-tooltip-top:before {
          border-top-color: #e5e7eb !important;
        }
      `}</style>
      <div 
        ref={mapContainerRef} 
        className="h-full w-full rounded-xl"
        style={{ minHeight: '300px' }}
      />
      
      {/* Satellite Toggle Button */}
      <div className="absolute top-4 right-4 z-[1000]">
        <Button
          variant="secondary"
          size="sm"
          className="gap-2 shadow-lg"
          onClick={toggleSatellite}
        >
          {isSatellite ? (
            <>
              <MapIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'es' ? 'Mapa' : 'Map'}</span>
            </>
          ) : (
            <>
              <Satellite className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'es' ? 'Satélite' : 'Satellite'}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
