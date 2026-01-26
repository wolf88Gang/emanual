import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Crosshair, Ruler, Pentagon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { MAP_LAYERS, getLayerById } from '@/lib/topographyLayers';
import { ParsedGeoJSON } from '@/lib/kmlParser';

interface TopographyMapProps {
  center: [number, number];
  zoom?: number;
  activeLayers: string[];
  importedGeoJSON?: ParsedGeoJSON | null;
  onCenterChange?: (lat: number, lng: number) => void;
  onTransectDraw?: (coords: [number, number][]) => void;
  onPolygonDraw?: (coords: [number, number][]) => void;
}

export function TopographyMap({
  center,
  zoom = 15,
  activeLayers,
  importedGeoJSON,
  onCenterChange,
  onTransectDraw,
  onPolygonDraw,
}: TopographyMapProps) {
  const { language } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Map<string, L.TileLayer>>(new Map());
  const geoJSONLayerRef = useRef<L.GeoJSON | null>(null);
  const [drawMode, setDrawMode] = useState<'none' | 'transect' | 'polygon'>('none');
  const [drawCoords, setDrawCoords] = useState<[number, number][]>([]);
  const drawLayerRef = useRef<L.Polyline | L.Polygon | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(center, zoom);

    // Base layer - OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    mapRef.current = map;

    // Center marker
    const centerMarker = L.circleMarker(center, {
      radius: 8,
      fillColor: 'hsl(var(--primary))',
      color: '#fff',
      weight: 2,
      fillOpacity: 0.8,
    }).addTo(map);

    map.on('moveend', () => {
      const newCenter = map.getCenter();
      centerMarker.setLatLng(newCenter);
      onCenterChange?.(newCenter.lat, newCenter.lng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle active layers
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Remove layers no longer active
    layersRef.current.forEach((layer, id) => {
      if (!activeLayers.includes(id)) {
        map.removeLayer(layer);
        layersRef.current.delete(id);
      }
    });

    // Add new active layers
    activeLayers.forEach((layerId) => {
      if (layersRef.current.has(layerId)) return;

      const layerConfig = getLayerById(layerId);
      if (!layerConfig || !layerConfig.available || !layerConfig.tileUrl) return;

      const tileLayer = L.tileLayer(layerConfig.tileUrl, {
        attribution: layerConfig.attribution,
        opacity: layerConfig.opacity,
      });

      tileLayer.addTo(map);
      layersRef.current.set(layerId, tileLayer);
    });
  }, [activeLayers]);

  // Handle imported GeoJSON
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Remove existing GeoJSON layer
    if (geoJSONLayerRef.current) {
      map.removeLayer(geoJSONLayerRef.current);
      geoJSONLayerRef.current = null;
    }

    if (importedGeoJSON && importedGeoJSON.features.length > 0) {
      const geoJSONLayer = L.geoJSON(importedGeoJSON as GeoJSON.FeatureCollection, {
        style: {
          color: '#e11d48',
          weight: 3,
          opacity: 0.8,
          fillColor: '#e11d48',
          fillOpacity: 0.2,
        },
        pointToLayer: (feature, latlng) => {
          return L.circleMarker(latlng, {
            radius: 10,
            fillColor: '#e11d48',
            color: '#fff',
            weight: 2,
            fillOpacity: 0.8,
          });
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties?.name) {
            layer.bindPopup(`<strong>${feature.properties.name}</strong>`);
          }
        },
      });

      geoJSONLayer.addTo(map);
      geoJSONLayerRef.current = geoJSONLayer;

      // Fit bounds to GeoJSON
      const bounds = geoJSONLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [importedGeoJSON]);

  // Handle drawing mode
  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    if (drawMode === 'none' || !mapRef.current) return;

    const newCoords: [number, number][] = [...drawCoords, [e.latlng.lat, e.latlng.lng]];
    setDrawCoords(newCoords);

    // Update visual
    if (drawLayerRef.current) {
      mapRef.current.removeLayer(drawLayerRef.current);
    }

    if (drawMode === 'transect' && newCoords.length >= 1) {
      drawLayerRef.current = L.polyline(newCoords, {
        color: '#3b82f6',
        weight: 3,
        dashArray: '5, 5',
      }).addTo(mapRef.current);
    } else if (drawMode === 'polygon' && newCoords.length >= 1) {
      drawLayerRef.current = L.polygon(newCoords, {
        color: '#8b5cf6',
        weight: 2,
        fillColor: '#8b5cf6',
        fillOpacity: 0.2,
      }).addTo(mapRef.current);
    }
  }, [drawMode, drawCoords]);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [handleMapClick]);

  const startTransect = () => {
    setDrawMode('transect');
    setDrawCoords([]);
    if (drawLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(drawLayerRef.current);
      drawLayerRef.current = null;
    }
  };

  const startPolygon = () => {
    setDrawMode('polygon');
    setDrawCoords([]);
    if (drawLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(drawLayerRef.current);
      drawLayerRef.current = null;
    }
  };

  const finishDrawing = () => {
    if (drawMode === 'transect' && drawCoords.length >= 2) {
      onTransectDraw?.(drawCoords);
    } else if (drawMode === 'polygon' && drawCoords.length >= 3) {
      onPolygonDraw?.(drawCoords);
    }
    setDrawMode('none');
  };

  const cancelDrawing = () => {
    setDrawMode('none');
    setDrawCoords([]);
    if (drawLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(drawLayerRef.current);
      drawLayerRef.current = null;
    }
  };

  const centerOnLocation = () => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  };

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden border">
      <div ref={mapContainerRef} className="h-full w-full" style={{ minHeight: '400px' }} />

      {/* Map controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="shadow-lg"
          onClick={centerOnLocation}
        >
          <Crosshair className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          variant={drawMode === 'transect' ? 'default' : 'secondary'}
          className="shadow-lg"
          onClick={drawMode === 'transect' ? cancelDrawing : startTransect}
          title={language === 'es' ? 'Dibujar transecto' : 'Draw transect'}
        >
          <Ruler className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          variant={drawMode === 'polygon' ? 'default' : 'secondary'}
          className="shadow-lg"
          onClick={drawMode === 'polygon' ? cancelDrawing : startPolygon}
          title={language === 'es' ? 'Dibujar polígono' : 'Draw polygon'}
        >
          <Pentagon className="h-4 w-4" />
        </Button>
      </div>

      {/* Drawing instructions */}
      {drawMode !== 'none' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-card border rounded-lg px-4 py-2 shadow-lg flex items-center gap-3">
          <span className="text-sm">
            {drawMode === 'transect' 
              ? (language === 'es' ? 'Haz clic para agregar puntos al transecto' : 'Click to add transect points')
              : (language === 'es' ? 'Haz clic para agregar vértices al polígono' : 'Click to add polygon vertices')}
          </span>
          <span className="text-xs text-muted-foreground">
            ({drawCoords.length} {language === 'es' ? 'puntos' : 'points'})
          </span>
          <Button size="sm" variant="outline" onClick={cancelDrawing}>
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          {((drawMode === 'transect' && drawCoords.length >= 2) || (drawMode === 'polygon' && drawCoords.length >= 3)) && (
            <Button size="sm" onClick={finishDrawing}>
              {language === 'es' ? 'Finalizar' : 'Finish'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
