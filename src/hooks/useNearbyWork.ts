import { useState, useEffect, useCallback } from 'react';
import { useGeolocation } from './useGeolocation';

interface NearbyAsset {
  id: string;
  name: string;
  asset_type: string;
  lat: number;
  lng: number;
  distance: number; // in meters
  zone?: {
    id: string;
    name: string;
    color: string;
  };
  pendingTasks: number;
}

interface NearbyZone {
  id: string;
  name: string;
  color: string;
  distance: number; // approximate, from centroid
  pendingTasks: number;
  overdueTasks: number;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Get centroid of a GeoJSON geometry
function getGeometryCentroid(geojson: any): { lat: number; lng: number } | null {
  if (!geojson) return null;
  
  try {
    // Handle different GeoJSON types
    let coordinates: number[][] = [];
    
    if (geojson.type === 'Polygon') {
      coordinates = geojson.coordinates[0];
    } else if (geojson.type === 'MultiPolygon') {
      coordinates = geojson.coordinates[0][0];
    } else if (geojson.geometry) {
      // Feature wrapper
      return getGeometryCentroid(geojson.geometry);
    } else {
      return null;
    }

    // Calculate centroid
    let sumLat = 0;
    let sumLng = 0;
    for (const coord of coordinates) {
      sumLng += coord[0];
      sumLat += coord[1];
    }
    
    return {
      lat: sumLat / coordinates.length,
      lng: sumLng / coordinates.length,
    };
  } catch (e) {
    console.error('Error calculating centroid:', e);
    return null;
  }
}

interface UseNearbyWorkProps {
  assets: Array<{
    id: string;
    name: string;
    asset_type: string;
    lat: number | null;
    lng: number | null;
    zone_id: string | null;
  }>;
  zones: Array<{
    id: string;
    name: string;
    color: string | null;
    geometry_geojson: any;
    pendingTasks?: number;
    overdueTasks?: number;
  }>;
  tasks: Array<{
    id: string;
    zone_id: string | null;
    asset_id: string | null;
    status: string | null;
    due_date: string | null;
  }>;
  maxDistance?: number; // Max distance in meters (default 100m)
}

export function useNearbyWork({ 
  assets, 
  zones, 
  tasks, 
  maxDistance = 100 
}: UseNearbyWorkProps) {
  const { latitude, longitude, loading: geoLoading, error: geoError, getCurrentPosition, hasLocation } = useGeolocation();
  const [nearbyAssets, setNearbyAssets] = useState<NearbyAsset[]>([]);
  const [nearbyZones, setNearbyZones] = useState<NearbyZone[]>([]);

  const calculateNearbyWork = useCallback(() => {
    if (!latitude || !longitude) return;

    const today = new Date().toISOString().split('T')[0];

    // Calculate task counts per zone and asset
    const zoneTaskCounts = new Map<string, { pending: number; overdue: number }>();
    const assetTaskCounts = new Map<string, number>();

    for (const task of tasks) {
      if (task.status === 'completed') continue;
      
      const isOverdue = task.due_date && task.due_date < today;
      
      if (task.zone_id) {
        const current = zoneTaskCounts.get(task.zone_id) || { pending: 0, overdue: 0 };
        if (isOverdue) {
          current.overdue++;
        } else {
          current.pending++;
        }
        zoneTaskCounts.set(task.zone_id, current);
      }
      
      if (task.asset_id) {
        assetTaskCounts.set(task.asset_id, (assetTaskCounts.get(task.asset_id) || 0) + 1);
      }
    }

    // Find zone lookup
    const zoneLookup = new Map(zones.map(z => [z.id, z]));

    // Calculate nearby assets
    const nearby = assets
      .filter(a => a.lat !== null && a.lng !== null)
      .map(asset => {
        const distance = calculateDistance(latitude, longitude, asset.lat!, asset.lng!);
        const zone = asset.zone_id ? zoneLookup.get(asset.zone_id) : undefined;
        
        return {
          id: asset.id,
          name: asset.name,
          asset_type: asset.asset_type,
          lat: asset.lat!,
          lng: asset.lng!,
          distance,
          zone: zone ? { id: zone.id, name: zone.name, color: zone.color || '#888' } : undefined,
          pendingTasks: assetTaskCounts.get(asset.id) || 0,
        };
      })
      .filter(a => a.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    setNearbyAssets(nearby);

    // Calculate nearby zones (by centroid)
    const nearbyZ = zones
      .map(zone => {
        const centroid = getGeometryCentroid(zone.geometry_geojson);
        if (!centroid) return null;
        
        const distance = calculateDistance(latitude, longitude, centroid.lat, centroid.lng);
        const taskCounts = zoneTaskCounts.get(zone.id) || { pending: 0, overdue: 0 };
        
        return {
          id: zone.id,
          name: zone.name,
          color: zone.color || '#888',
          distance,
          pendingTasks: taskCounts.pending,
          overdueTasks: taskCounts.overdue,
        };
      })
      .filter((z): z is NearbyZone => z !== null && z.distance <= maxDistance * 3) // Zones can be further
      .sort((a, b) => a.distance - b.distance);

    setNearbyZones(nearbyZ);
  }, [latitude, longitude, assets, zones, tasks, maxDistance]);

  useEffect(() => {
    if (hasLocation) {
      calculateNearbyWork();
    }
  }, [hasLocation, calculateNearbyWork]);

  const refresh = useCallback(async () => {
    await getCurrentPosition();
  }, [getCurrentPosition]);

  return {
    nearbyAssets,
    nearbyZones,
    userLocation: hasLocation ? { latitude: latitude!, longitude: longitude! } : null,
    loading: geoLoading,
    error: geoError,
    refresh,
    hasLocation,
    totalNearbyTasks: nearbyAssets.reduce((sum, a) => sum + a.pendingTasks, 0) +
                      nearbyZones.reduce((sum, z) => sum + z.pendingTasks + z.overdueTasks, 0),
  };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}
