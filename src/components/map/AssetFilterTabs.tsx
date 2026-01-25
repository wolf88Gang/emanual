import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Layers, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AssetTypeIcon } from '@/components/icons/AssetTypeIcon';

interface Zone {
  id: string;
  name: string;
  color: string;
}

interface AssetFilterTabsProps {
  zones: Zone[];
  assetTypeCounts: Record<string, number>;
  selectedZone: Zone | null;
  filterType: string | null;
  onZoneSelect: (zone: Zone | null) => void;
  onTypeFilter: (type: string | null) => void;
  assetsPerZone: Record<string, number>;
}

export function AssetFilterTabs({
  zones,
  assetTypeCounts,
  selectedZone,
  filterType,
  onZoneSelect,
  onTypeFilter,
  assetsPerZone,
}: AssetFilterTabsProps) {
  const { language } = useLanguage();

  return (
    <Tabs defaultValue="zones" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="zones" className="flex-1">
          <Layers className="h-4 w-4 mr-1" />
          {language === 'es' ? 'Zonas' : 'Zones'}
        </TabsTrigger>
        <TabsTrigger value="types" className="flex-1">
          <Filter className="h-4 w-4 mr-1" />
          {language === 'es' ? 'Tipos' : 'Types'}
        </TabsTrigger>
      </TabsList>

      <div className="mt-4 space-y-2">
        <Tabs defaultValue="zones">
          {/* Zones Tab Content */}
          <div data-value="zones" className={filterType === null ? 'block' : 'hidden'}>
            {selectedZone && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-primary mb-2"
                onClick={() => onZoneSelect(null)}
              >
                <X className="h-4 w-4 mr-2" />
                {language === 'es' ? 'Limpiar filtro' : 'Clear filter'}
              </Button>
            )}
            
            {zones.map((zone) => (
              <button
                key={zone.id}
                onClick={() => onZoneSelect(selectedZone?.id === zone.id ? null : zone)}
                className={cn(
                  'w-full p-3 rounded-lg text-left transition-colors mb-2',
                  'border border-border hover:border-primary/50',
                  selectedZone?.id === zone.id && 'bg-primary/10 border-primary'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: zone.color || '#10b981' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{zone.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {assetsPerZone[zone.id] || 0} {language === 'es' ? 'activos' : 'assets'}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {zones.length === 0 && (
              <p className="text-center text-muted-foreground py-6">
                {language === 'es' ? 'Sin zonas definidas' : 'No zones defined'}
              </p>
            )}
          </div>

          {/* Types Tab Content */}
          <div data-value="types" className={filterType !== null || selectedZone === null ? 'block' : 'hidden'}>
            {filterType && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-primary mb-2"
                onClick={() => onTypeFilter(null)}
              >
                <X className="h-4 w-4 mr-2" />
                {language === 'es' ? 'Limpiar filtro' : 'Clear filter'}
              </Button>
            )}

            {Object.entries(assetTypeCounts).map(([type, count]) => (
              <button
                key={type}
                onClick={() => onTypeFilter(filterType === type ? null : type)}
                className={cn(
                  'w-full p-3 rounded-lg text-left transition-colors mb-2',
                  'border border-border hover:border-primary/50',
                  'flex items-center gap-3',
                  filterType === type && 'bg-primary/10 border-primary'
                )}
              >
                <AssetTypeIcon type={type as any} size="md" />
                <span className="flex-1 font-medium capitalize">
                  {type.replace('_', ' ')}
                </span>
                <Badge variant="secondary">{count}</Badge>
              </button>
            ))}
          </div>
        </Tabs>
      </div>
    </Tabs>
  );
}
