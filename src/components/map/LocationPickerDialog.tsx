import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Check, X, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGeolocation } from '@/hooks/useGeolocation';

interface LocationPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLat?: number;
  initialLng?: number;
  estateLat?: number | null;
  estateLng?: number | null;
  onConfirm: (lat: number, lng: number) => void;
}

export function LocationPickerDialog({
  open,
  onOpenChange,
  initialLat,
  initialLng,
  estateLat,
  estateLng,
  onConfirm,
}: LocationPickerDialogProps) {
  const { language } = useLanguage();
  const { latitude, longitude, getCurrentPosition, loading: geoLoading } = useGeolocation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );

  // Priority: asset coords > estate coords > default Puerto Rico
  const defaultCenter: [number, number] = initialLat && initialLng 
    ? [initialLat, initialLng] 
    : (estateLat && estateLng 
        ? [estateLat, estateLng] 
        : [18.4655, -66.1057]);

  // Initialize map using callback ref pattern
  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const container = mapContainerRef.current;
    
    // Ensure container has dimensions
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      // Retry after a short delay
      setTimeout(initializeMap, 100);
      return;
    }

    const map = L.map(container).setView(defaultCenter, 17);
    
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri',
      maxZoom: 20,
    }).addTo(map);

    // Add initial marker if location exists
    if (initialLat && initialLng) {
      const marker = L.marker([initialLat, initialLng], {
        icon: L.divIcon({
          html: `<div style="
            width: 40px;
            height: 40px;
            background: hsl(142, 76%, 36%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            border: 3px solid white;
          ">📍</div>`,
          className: 'location-picker-marker',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        }),
      }).addTo(map);
      markerRef.current = marker;
    }

    // Handle map clicks
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setSelectedLocation({ lat, lng });

      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            html: `<div style="
              width: 40px;
              height: 40px;
              background: hsl(142, 76%, 36%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4);
              border: 3px solid white;
            ">📍</div>`,
            className: 'location-picker-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          }),
        }).addTo(map);
        markerRef.current = marker;
      }
    });

    mapRef.current = map;
    setMapReady(true);
    
    // Force resize
    setTimeout(() => map.invalidateSize(), 100);
  }, [defaultCenter, initialLat, initialLng, estateLat, estateLng]);

  // Initialize when dialog opens
  useEffect(() => {
    if (open) {
      // Wait for dialog animation to complete
      const timer = setTimeout(initializeMap, 400);
      return () => clearTimeout(timer);
    } else {
      // Cleanup when closing
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        setMapReady(false);
      }
    }
  }, [open, initializeMap]);

  // Reset selected location when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedLocation(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
      );
    }
  }, [open, initialLat, initialLng]);

  async function handleLocateMe() {
    try {
      await getCurrentPosition();
      if (latitude && longitude && mapRef.current) {
        mapRef.current.setView([latitude, longitude], 18);
        setSelectedLocation({ lat: latitude, lng: longitude });
        
        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
        } else {
          const marker = L.marker([latitude, longitude], {
            icon: L.divIcon({
              html: `<div style="
                width: 40px;
                height: 40px;
                background: hsl(142, 76%, 36%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                border: 3px solid white;
              ">📍</div>`,
              className: 'location-picker-marker',
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            }),
          }).addTo(mapRef.current);
          markerRef.current = marker;
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  }

  function handleConfirm() {
    if (selectedLocation) {
      onConfirm(selectedLocation.lat, selectedLocation.lng);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {language === 'es' ? 'Seleccionar Ubicación' : 'Select Location'}
          </DialogTitle>
          <DialogDescription>
            {language === 'es' 
              ? 'Toca el mapa para seleccionar la ubicación exacta del activo' 
              : 'Tap on the map to select the exact location of the asset'}
          </DialogDescription>
        </DialogHeader>

        {/* Map container - fixed height */}
        <div className="relative mx-4 h-[400px]">
          <div 
            ref={mapContainerRef} 
            className="absolute inset-0 rounded-lg overflow-hidden border border-border bg-muted"
          />
          
          {/* Loading state */}
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center z-[998]">
              <div className="animate-pulse text-muted-foreground text-sm">
                {language === 'es' ? 'Cargando mapa...' : 'Loading map...'}
              </div>
            </div>
          )}
          
          {/* Locate me button */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-3 right-3 z-[1000] shadow-lg"
            onClick={handleLocateMe}
            disabled={geoLoading}
          >
            <Navigation className="h-4 w-4" />
          </Button>

          {/* Instructions overlay */}
          {mapReady && !selectedLocation && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[999]">
              <div className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-border">
                <span className="text-sm font-medium">
                  {language === 'es' ? '👆 Toca para seleccionar' : '👆 Tap to select'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Selected coordinates display */}
        {selectedLocation && (
          <div className="mx-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-center font-mono">
              <span className="text-muted-foreground">Lat:</span> {selectedLocation.lat.toFixed(6)}
              <span className="mx-2">|</span>
              <span className="text-muted-foreground">Lng:</span> {selectedLocation.lng.toFixed(6)}
            </p>
          </div>
        )}

        <DialogFooter className="p-4 pt-2 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" />
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedLocation}>
            <Check className="h-4 w-4 mr-1" />
            {language === 'es' ? 'Confirmar Ubicación' : 'Confirm Location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
