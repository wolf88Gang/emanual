import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Edit3, Save, X, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MapZone } from './types';

const ZONE_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

interface ZoneEditPanelProps {
  zone: MapZone;
  mapRef: L.Map | null;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function ZoneEditPanel({
  zone,
  mapRef,
  onClose,
  onUpdated,
  onDeleted,
}: ZoneEditPanelProps) {
  const { language } = useLanguage();
  const [name, setName] = useState(zone.name);
  const [color, setColor] = useState(zone.color || '#10b981');
  const [purposeTags, setPurposeTags] = useState(zone.purpose_tags?.join(', ') || '');
  const [notes, setNotes] = useState(zone.notes || '');
  const [saving, setSaving] = useState(false);
  const [isEditingPolygon, setIsEditingPolygon] = useState(false);
  const [editedPoints, setEditedPoints] = useState<L.LatLng[]>([]);
  const polygonRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const originalGeoJson = useRef(zone.geometry_geojson);

  // Initialize polygon points from zone geometry
  useEffect(() => {
    if (zone.geometry_geojson?.coordinates?.[0]) {
      const coords = zone.geometry_geojson.coordinates[0];
      // Remove the closing duplicate point
      const points = coords.slice(0, -1).map((c: number[]) => L.latLng(c[1], c[0]));
      setEditedPoints(points);
    }
  }, [zone.geometry_geojson]);

  // Render editable polygon when in edit mode
  useEffect(() => {
    if (!mapRef || !isEditingPolygon) return;

    // Clear previous
    if (polygonRef.current) {
      mapRef.removeLayer(polygonRef.current);
    }
    markersRef.current.forEach(m => mapRef.removeLayer(m));
    markersRef.current = [];

    if (editedPoints.length >= 3) {
      // Draw polygon
      polygonRef.current = L.polygon(editedPoints, {
        fillColor: color,
        fillOpacity: 0.4,
        color: color,
        weight: 3,
        dashArray: '5, 5',
      }).addTo(mapRef);
    }

    // Draw vertex markers
    editedPoints.forEach((point, idx) => {
      const marker = L.circleMarker(point, {
        radius: 10,
        fillColor: color,
        fillOpacity: 1,
        color: 'white',
        weight: 3,
        draggable: true,
      } as any).addTo(mapRef);

      // Make markers draggable with mouse events
      let isDragging = false;
      
      marker.on('mousedown', (e) => {
        isDragging = true;
        mapRef.dragging.disable();
        L.DomEvent.stopPropagation(e);
      });

      mapRef.on('mousemove', (e: L.LeafletMouseEvent) => {
        if (isDragging) {
          marker.setLatLng(e.latlng);
          setEditedPoints(prev => {
            const newPoints = [...prev];
            newPoints[idx] = e.latlng;
            return newPoints;
          });
        }
      });

      mapRef.on('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          mapRef.dragging.enable();
        }
      });

      // Right-click to delete point
      marker.on('contextmenu', (e) => {
        L.DomEvent.stopPropagation(e);
        if (editedPoints.length > 3) {
          setEditedPoints(prev => prev.filter((_, i) => i !== idx));
        } else {
          toast.error(language === 'es' ? 'Mínimo 3 puntos' : 'Minimum 3 points');
        }
      });

      markersRef.current.push(marker);
    });

    // Allow adding points by clicking on polygon edge
    const handleClick = (e: L.LeafletMouseEvent) => {
      if (!isEditingPolygon) return;
      
      // Find nearest edge and insert point
      let minDist = Infinity;
      let insertIdx = 0;
      
      for (let i = 0; i < editedPoints.length; i++) {
        const p1 = editedPoints[i];
        const p2 = editedPoints[(i + 1) % editedPoints.length];
        const dist = distanceToSegment(e.latlng, p1, p2);
        if (dist < minDist) {
          minDist = dist;
          insertIdx = i + 1;
        }
      }

      if (minDist < 50) { // pixels threshold
        setEditedPoints(prev => {
          const newPoints = [...prev];
          newPoints.splice(insertIdx, 0, e.latlng);
          return newPoints;
        });
      }
    };

    mapRef.on('click', handleClick);

    return () => {
      if (polygonRef.current && mapRef) {
        mapRef.removeLayer(polygonRef.current);
      }
      markersRef.current.forEach(m => {
        if (mapRef) mapRef.removeLayer(m);
      });
      mapRef.off('click', handleClick);
      mapRef.off('mousemove');
      mapRef.off('mouseup');
    };
  }, [mapRef, isEditingPolygon, editedPoints, color, language]);

  function distanceToSegment(p: L.LatLng, p1: L.LatLng, p2: L.LatLng): number {
    const x = p.lng, y = p.lat;
    const x1 = p1.lng, y1 = p1.lat;
    const x2 = p2.lng, y2 = p2.lat;
    
    const A = x - x1, B = y - y1, C = x2 - x1, D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;
    
    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }
    
    return Math.sqrt((x - xx) ** 2 + (y - yy) ** 2) * 100000; // rough pixel conversion
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updateData: any = {
        name,
        color,
        purpose_tags: purposeTags.split(',').map(t => t.trim()).filter(Boolean),
        notes: notes || null,
      };

      // If polygon was edited, include the new geometry
      if (isEditingPolygon && editedPoints.length >= 3) {
        const coordinates = [editedPoints.map(p => [p.lng, p.lat])];
        coordinates[0].push(coordinates[0][0]); // Close polygon
        updateData.geometry_geojson = {
          type: 'Polygon',
          coordinates,
        };
      }

      const { error } = await supabase
        .from('zones')
        .update(updateData)
        .eq('id', zone.id);

      if (error) throw error;

      toast.success(language === 'es' ? '✅ Zona actualizada' : '✅ Zone updated');
      setIsEditingPolygon(false);
      onUpdated();
    } catch (error) {
      console.error('Error updating zone:', error);
      toast.error(language === 'es' ? 'Error al actualizar' : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const { error } = await supabase
        .from('zones')
        .delete()
        .eq('id', zone.id);

      if (error) throw error;

      toast.success(language === 'es' ? 'Zona eliminada' : 'Zone deleted');
      onDeleted();
    } catch (error) {
      console.error('Error deleting zone:', error);
      toast.error(language === 'es' ? 'Error al eliminar' : 'Delete failed');
    }
  }

  function handleResetPolygon() {
    if (originalGeoJson.current?.coordinates?.[0]) {
      const coords = originalGeoJson.current.coordinates[0];
      const points = coords.slice(0, -1).map((c: number[]) => L.latLng(c[1], c[0]));
      setEditedPoints(points);
    }
  }

  function handleStartEditPolygon() {
    setIsEditingPolygon(true);
    // Hide original zone polygon while editing
    if (mapRef) {
      mapRef.eachLayer((layer: any) => {
        if (layer._isZoneLayer && layer.feature?.properties?.id === zone.id) {
          layer.setStyle({ opacity: 0, fillOpacity: 0 });
        }
      });
    }
  }

  function handleCancelEditPolygon() {
    setIsEditingPolygon(false);
    handleResetPolygon();
    // Show original zone polygon again
    if (mapRef) {
      mapRef.eachLayer((layer: any) => {
        if (layer._isZoneLayer) {
          layer.setStyle({ opacity: 1, fillOpacity: 0.2 });
        }
      });
    }
  }

  return (
    <Card className="absolute top-4 left-4 right-4 z-[1001] bg-card/95 backdrop-blur-sm max-w-md shadow-xl">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Edit3 className="h-4 w-4 text-primary" />
          {language === 'es' ? 'Editar Zona' : 'Edit Zone'}
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 pb-4 max-h-[60vh] overflow-y-auto">
        {/* Name */}
        <div className="space-y-2">
          <Label className="text-xs">{language === 'es' ? 'Nombre' : 'Name'}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
        </div>

        {/* Color */}
        <div className="space-y-2">
          <Label className="text-xs">{language === 'es' ? 'Color' : 'Color'}</Label>
          <div className="flex gap-2 flex-wrap">
            {ZONE_COLORS.map(c => (
              <button
                key={c}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  color === c ? 'border-foreground scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        {/* Purpose Tags */}
        <div className="space-y-2">
          <Label className="text-xs">{language === 'es' ? 'Propósitos' : 'Purpose Tags'}</Label>
          <Input
            value={purposeTags}
            onChange={(e) => setPurposeTags(e.target.value)}
            placeholder={language === 'es' ? 'ornamental, riego' : 'ornamental, irrigation'}
            className="h-9"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-xs">{language === 'es' ? 'Notas' : 'Notes'}</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={language === 'es' ? 'Notas adicionales...' : 'Additional notes...'}
            className="h-9"
          />
        </div>

        {/* Polygon Edit Section */}
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs">{language === 'es' ? 'Límites de Zona' : 'Zone Boundaries'}</Label>
          {!isEditingPolygon ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={handleStartEditPolygon}
              disabled={!zone.geometry_geojson}
            >
              <Edit3 className="h-4 w-4" />
              {language === 'es' ? 'Editar Polígono' : 'Edit Polygon'}
            </Button>
          ) : (
            <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                {language === 'es' 
                  ? '• Arrastra los puntos para mover\n• Click derecho para eliminar punto\n• Click cerca de una línea para agregar punto'
                  : '• Drag points to move\n• Right-click to delete point\n• Click near edge to add point'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleCancelEditPolygon}>
                  <X className="h-3 w-3 mr-1" />
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetPolygon}>
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {language === 'es' ? '¿Eliminar zona?' : 'Delete zone?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {language === 'es' 
                    ? `Esto eliminará "${name}" permanentemente. Los activos en esta zona no serán eliminados.`
                    : `This will permanently delete "${name}". Assets in this zone will not be deleted.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{language === 'es' ? 'Cancelar' : 'Cancel'}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  {language === 'es' ? 'Eliminar' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving || !name.trim()}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? '...' : (language === 'es' ? 'Guardar' : 'Save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
