import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { MapZone } from './types';

interface ZoneLegendProps {
  zones: MapZone[];
  selectedZone: MapZone | null;
  onZoneSelect: (zone: MapZone | null) => void;
  className?: string;
}

export function ZoneLegend({ zones, selectedZone, onZoneSelect, className }: ZoneLegendProps) {
  const { language } = useLanguage();

  if (zones.length === 0) return null;

  return (
    <div className={cn(
      'bg-card/95 backdrop-blur-sm rounded-xl p-3 border border-border shadow-lg',
      className
    )}>
      <p className="text-xs font-medium text-muted-foreground mb-2">
        {language === 'es' ? 'Zonas' : 'Zones'}
      </p>
      <div className="flex flex-wrap gap-2">
        {zones.map((zone) => (
          <button
            key={zone.id}
            onClick={() => onZoneSelect(selectedZone?.id === zone.id ? null : zone)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full transition-all',
              'hover:bg-primary/10',
              selectedZone?.id === zone.id && 'bg-primary/20 ring-1 ring-primary'
            )}
          >
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: zone.color || '#10b981' }}
            />
            <span className="text-xs font-medium">{zone.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
