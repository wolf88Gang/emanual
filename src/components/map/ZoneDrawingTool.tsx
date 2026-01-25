import React, { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Pencil, Save, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

interface ZoneDrawingToolProps {
  mapRef: L.Map | null;
  onSaveZone: (zone: {
    name: string;
    color: string;
    geometry_geojson: any;
    purpose_tags: string[];
  }) => void;
  onCancel: () => void;
  isActive: boolean;
}

const ZONE_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export function ZoneDrawingTool({ 
  mapRef, 
  onSaveZone, 
  onCancel, 
  isActive 
}: ZoneDrawingToolProps) {
  const { language } = useLanguage();
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const [zoneName, setZoneName] = useState('');
  const [selectedColor, setSelectedColor] = useState(ZONE_COLORS[0]);
  const [purposeTags, setPurposeTags] = useState('');
  const polygonRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const previewLineRef = useRef<L.Polyline | null>(null);

  // Set up map click handler
  useEffect(() => {
    if (!mapRef || !isActive) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      const newPoint = e.latlng;
      setPoints(prev => [...prev, newPoint]);
    };

    mapRef.on('click', handleClick);

    return () => {
      mapRef.off('click', handleClick);
    };
  }, [mapRef, isActive]);

  // Update polygon as points change
  useEffect(() => {
    if (!mapRef) return;

    // Clear previous polygon and markers
    if (polygonRef.current) {
      mapRef.removeLayer(polygonRef.current);
    }
    markersRef.current.forEach(m => mapRef.removeLayer(m));
    markersRef.current = [];
    if (previewLineRef.current) {
      mapRef.removeLayer(previewLineRef.current);
    }

    if (points.length < 2) {
      // Just show point markers
      points.forEach((point, idx) => {
        const marker = L.circleMarker(point, {
          radius: 8,
          fillColor: selectedColor,
          fillOpacity: 1,
          color: 'white',
          weight: 2
        }).addTo(mapRef);
        markersRef.current.push(marker);
      });
      return;
    }

    // Create polygon preview
    polygonRef.current = L.polygon(points, {
      fillColor: selectedColor,
      fillOpacity: 0.3,
      color: selectedColor,
      weight: 3,
      dashArray: '5, 5'
    }).addTo(mapRef);

    // Add point markers
    points.forEach((point, idx) => {
      const marker = L.circleMarker(point, {
        radius: 8,
        fillColor: selectedColor,
        fillOpacity: 1,
        color: 'white',
        weight: 2
      }).addTo(mapRef);
      
      // Allow dragging points
      marker.on('click', () => {
        // Remove point on click
        setPoints(prev => prev.filter((_, i) => i !== idx));
      });
      
      markersRef.current.push(marker);
    });

    return () => {
      if (polygonRef.current && mapRef) {
        mapRef.removeLayer(polygonRef.current);
      }
      markersRef.current.forEach(m => {
        if (mapRef) mapRef.removeLayer(m);
      });
    };
  }, [mapRef, points, selectedColor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef) {
        if (polygonRef.current) {
          mapRef.removeLayer(polygonRef.current);
        }
        markersRef.current.forEach(m => mapRef.removeLayer(m));
        if (previewLineRef.current) {
          mapRef.removeLayer(previewLineRef.current);
        }
      }
    };
  }, [mapRef]);

  function handleSave() {
    if (points.length < 3 || !zoneName.trim()) return;

    // Create GeoJSON polygon
    const coordinates = [
      points.map(p => [p.lng, p.lat]),
    ];
    // Close the polygon
    coordinates[0].push(coordinates[0][0]);

    const geometry_geojson = {
      type: 'Polygon',
      coordinates
    };

    onSaveZone({
      name: zoneName,
      color: selectedColor,
      geometry_geojson,
      purpose_tags: purposeTags.split(',').map(t => t.trim()).filter(Boolean)
    });

    // Reset
    setPoints([]);
    setZoneName('');
    setPurposeTags('');
  }

  function handleClear() {
    setPoints([]);
  }

  function handleCancel() {
    setPoints([]);
    setZoneName('');
    setPurposeTags('');
    onCancel();
  }

  if (!isActive) return null;

  return (
    <Card className="absolute top-4 left-4 right-4 z-[1000] bg-card/95 backdrop-blur-sm max-w-sm">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Pencil className="h-4 w-4 text-primary" />
          {language === 'es' ? 'Dibujar Nueva Zona' : 'Draw New Zone'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <p className="text-xs text-muted-foreground">
          {language === 'es' 
            ? 'Toca el mapa para agregar puntos. Mínimo 3 puntos.' 
            : 'Tap the map to add points. Minimum 3 points.'}
        </p>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{points.length}</span>
          <span className="text-muted-foreground">
            {language === 'es' ? 'puntos' : 'points'}
          </span>
          {points.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 px-2 ml-auto">
              <Trash2 className="h-3 w-3 mr-1" />
              {language === 'es' ? 'Limpiar' : 'Clear'}
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">{language === 'es' ? 'Nombre de Zona *' : 'Zone Name *'}</Label>
          <Input
            placeholder={language === 'es' ? 'Ej: Jardín Norte' : 'E.g., North Garden'}
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">{language === 'es' ? 'Color' : 'Color'}</Label>
          <div className="flex gap-2 flex-wrap">
            {ZONE_COLORS.map(color => (
              <button
                key={color}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  selectedColor === color ? 'border-foreground scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">{language === 'es' ? 'Propósitos (separados por coma)' : 'Purpose Tags (comma separated)'}</Label>
          <Input
            placeholder={language === 'es' ? 'ornamental, riego, sombra' : 'ornamental, irrigation, shade'}
            value={purposeTags}
            onChange={(e) => setPurposeTags(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" />
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleSave}
            disabled={points.length < 3 || !zoneName.trim()}
          >
            <Save className="h-4 w-4 mr-1" />
            {language === 'es' ? 'Guardar' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
