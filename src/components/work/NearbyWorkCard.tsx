import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Loader2, AlertCircle, ChevronRight, Locate } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistance } from '@/hooks/useNearbyWork';
import { AssetTypeIcon } from '@/components/icons/AssetTypeIcon';

interface NearbyAsset {
  id: string;
  name: string;
  asset_type: string;
  distance: number;
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
  distance: number;
  pendingTasks: number;
  overdueTasks: number;
}

interface NearbyWorkCardProps {
  nearbyAssets: NearbyAsset[];
  nearbyZones: NearbyZone[];
  loading: boolean;
  error: string | null;
  hasLocation: boolean;
  onRefresh: () => void;
}

export function NearbyWorkCard({
  nearbyAssets,
  nearbyZones,
  loading,
  error,
  hasLocation,
  onRefresh,
}: NearbyWorkCardProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Show nothing if no location and not loading
  if (!hasLocation && !loading && !error) {
    return (
      <Card className="estate-card bg-gradient-to-br from-info/5 to-info/10 border-info/20">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-info/10">
              <Locate className="h-6 w-6 text-info" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {language === 'es' ? 'Activar ubicación' : 'Enable location'}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'es' 
                  ? 'Ver trabajo cerca de ti' 
                  : 'See work near you'}
              </p>
            </div>
            <Button onClick={onRefresh} variant="secondary" size="sm">
              <Navigation className="h-4 w-4 mr-2" />
              {language === 'es' ? 'Activar' : 'Enable'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="estate-card">
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">
            {language === 'es' ? 'Obteniendo ubicación...' : 'Getting location...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="estate-card border-destructive/30">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <Button onClick={onRefresh} variant="outline" size="sm">
              {language === 'es' ? 'Reintentar' : 'Retry'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasNearbyWork = nearbyAssets.length > 0 || nearbyZones.length > 0;
  const totalTasks = nearbyAssets.reduce((sum, a) => sum + a.pendingTasks, 0) +
                     nearbyZones.reduce((sum, z) => sum + z.pendingTasks + z.overdueTasks, 0);

  if (!hasNearbyWork) {
    return (
      <Card className="estate-card bg-gradient-to-br from-success/5 to-success/10 border-success/20">
        <CardContent className="py-6 text-center">
          <Navigation className="h-10 w-10 mx-auto text-success mb-2" />
          <p className="font-medium">
            {language === 'es' ? 'No hay trabajo cerca' : 'No work nearby'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'es' 
              ? 'Consulta el mapa para ver otras áreas' 
              : 'Check the map for other areas'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="estate-card overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-info/5 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <Navigation className="h-5 w-5 text-info" />
            {language === 'es' ? 'Cerca de ti' : 'Near you'}
          </CardTitle>
          {totalTasks > 0 && (
            <Badge variant="secondary" className="bg-info/10 text-info">
              {totalTasks} {language === 'es' ? 'tareas' : 'tasks'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Nearby Zones */}
        {nearbyZones.slice(0, 2).map((zone) => (
          <button
            key={zone.id}
            onClick={() => navigate(`/map?zone=${zone.id}`)}
            className={cn(
              'w-full p-4 rounded-xl text-left transition-all',
              'bg-secondary/50 hover:bg-secondary',
              'border border-transparent hover:border-border'
            )}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-3 h-10 rounded-full shrink-0"
                style={{ backgroundColor: zone.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium truncate">{zone.name}</h4>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistance(zone.distance)}
                  </span>
                </div>
                {(zone.pendingTasks > 0 || zone.overdueTasks > 0) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {zone.overdueTasks > 0 && (
                      <span className="text-destructive mr-2">
                        {zone.overdueTasks} {language === 'es' ? 'vencidas' : 'overdue'}
                      </span>
                    )}
                    {zone.pendingTasks > 0 && (
                      <span>
                        {zone.pendingTasks} {language === 'es' ? 'pendientes' : 'pending'}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </button>
        ))}

        {/* Nearby Assets */}
        {nearbyAssets.slice(0, 3).map((asset) => (
          <button
            key={asset.id}
            onClick={() => navigate(`/assets/${asset.id}`)}
            className={cn(
              'w-full p-3 rounded-xl text-left transition-all',
              'bg-muted/50 hover:bg-muted',
              'flex items-center gap-3'
            )}
          >
            <div className="p-2 rounded-lg bg-background">
              <AssetTypeIcon type={asset.asset_type as any} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm">{asset.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDistance(asset.distance)}</span>
                {asset.zone && (
                  <>
                    <span>•</span>
                    <span className="truncate">{asset.zone.name}</span>
                  </>
                )}
              </div>
            </div>
            {asset.pendingTasks > 0 && (
              <Badge variant="secondary" className="shrink-0">
                {asset.pendingTasks}
              </Badge>
            )}
          </button>
        ))}

        {/* Refresh button */}
        <Button 
          variant="ghost" 
          className="w-full text-muted-foreground" 
          size="sm"
          onClick={onRefresh}
        >
          <Locate className="h-4 w-4 mr-2" />
          {language === 'es' ? 'Actualizar ubicación' : 'Refresh location'}
        </Button>
      </CardContent>
    </Card>
  );
}
