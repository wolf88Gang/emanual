import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
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
  center = [18.4655, -66.1057],
  zoom = 16,
}: EstateMapProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(center, zoom);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;
    setIsMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center when it changes
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

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

  // Add asset markers
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const map = mapRef.current;
    
    // Clear existing asset markers
    map.eachLayer((layer) => {
      if ((layer as any)._isAssetMarker) {
        map.removeLayer(layer);
      }
    });

    // Add asset markers
    const mappableAssets = assets.filter(a => a.lat !== null && a.lng !== null);
    
    mappableAssets.forEach((asset) => {
      const marker = L.marker([asset.lat!, asset.lng!], {
        icon: createAssetIcon(asset.asset_type, (asset.risk_flags?.length || 0) > 0),
      });

      (marker as any)._isAssetMarker = true;

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
      marker.addTo(map);
    });
  }, [assets, language, isMapReady]);

  return (
    <div 
      ref={mapContainerRef} 
      className="h-full w-full rounded-xl"
      style={{ minHeight: '300px' }}
    />
  );
}
