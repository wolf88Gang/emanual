import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Layers, 
  Filter, 
  Search,
  TreeDeciduous,
  Droplets,
  Lightbulb,
  Flower2,
  ChevronRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AssetTypeIcon, getAssetBadgeClass } from '@/components/icons/AssetTypeIcon';

interface Zone {
  id: string;
  name: string;
  purpose_tags: string[];
  color: string;
  notes: string | null;
}

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  zone_id: string | null;
  zone?: Zone;
  lat: number | null;
  lng: number | null;
  critical_care_note: string | null;
  purpose_tags: string[];
  risk_flags: string[];
  last_service_date: string | null;
}

export default function MapView() {
  const { t, language } = useLanguage();
  const { currentEstate } = useEstate();
  const [zones, setZones] = useState<Zone[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentEstate) {
      fetchMapData();
    }
  }, [currentEstate]);

  async function fetchMapData() {
    if (!currentEstate) return;
    
    setLoading(true);
    try {
      const [zonesRes, assetsRes] = await Promise.all([
        supabase
          .from('zones')
          .select('*')
          .eq('estate_id', currentEstate.id)
          .order('name'),
        supabase
          .from('assets')
          .select('*, zones:zone_id(*)')
          .eq('estate_id', currentEstate.id)
          .order('name'),
      ]);

      setZones((zonesRes.data || []) as Zone[]);
      setAssets((assetsRes.data || []).map(a => ({
        ...a,
        zone: a.zones as Zone | undefined,
      })) as Asset[]);
    } catch (error) {
      console.error('Error fetching map data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAssets = assets.filter(asset => {
    if (filterType && asset.asset_type !== filterType) return false;
    if (selectedZone && asset.zone_id !== selectedZone.id) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        asset.name.toLowerCase().includes(query) ||
        asset.asset_type.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const assetTypeCounts = assets.reduce((acc, asset) => {
    acc[asset.asset_type] = (acc[asset.asset_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border bg-card p-4 overflow-auto">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="zones">
              <TabsList className="w-full">
                <TabsTrigger value="zones" className="flex-1">
                  <Layers className="h-4 w-4 mr-1" />
                  Zones
                </TabsTrigger>
                <TabsTrigger value="types" className="flex-1">
                  <Filter className="h-4 w-4 mr-1" />
                  Types
                </TabsTrigger>
              </TabsList>

              <TabsContent value="zones" className="mt-4 space-y-2">
                {selectedZone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-primary"
                    onClick={() => setSelectedZone(null)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear zone filter
                  </Button>
                )}
                {zones.map((zone) => (
                  <button
                    key={zone.id}
                    onClick={() => setSelectedZone(
                      selectedZone?.id === zone.id ? null : zone
                    )}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-colors',
                      'border border-border hover:border-primary/50',
                      selectedZone?.id === zone.id && 'bg-primary/10 border-primary'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: zone.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{zone.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {assets.filter(a => a.zone_id === zone.id).length} assets
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
                {zones.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">
                    No zones defined yet
                  </p>
                )}
              </TabsContent>

              <TabsContent value="types" className="mt-4 space-y-2">
                {filterType && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-primary"
                    onClick={() => setFilterType(null)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear type filter
                  </Button>
                )}
                {Object.entries(assetTypeCounts).map(([type, count]) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(
                      filterType === type ? null : type
                    )}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-colors',
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
              </TabsContent>
            </Tabs>
          </div>
        </aside>

        {/* Map Area */}
        <div className="flex-1 relative bg-estate-sand/30">
          {/* Placeholder Map */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-6 max-w-md">
              <MapPin className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-serif font-semibold mb-2">
                Interactive Map
              </h3>
              <p className="text-muted-foreground mb-4">
                Your estate map with zones and asset pins will display here. 
                Click assets below to view details.
              </p>

              {/* Asset Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
                {filteredAssets.slice(0, 9).map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className="p-3 rounded-xl bg-card border border-border hover:border-primary transition-all hover:shadow-md text-left"
                  >
                    <AssetTypeIcon type={asset.asset_type as any} size="lg" />
                    <p className="font-medium text-sm mt-2 truncate">
                      {asset.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {asset.zone?.name || 'No zone'}
                    </p>
                  </button>
                ))}
              </div>

              {filteredAssets.length > 9 && (
                <p className="text-sm text-muted-foreground mt-4">
                  +{filteredAssets.length - 9} more assets
                </p>
              )}
            </div>
          </div>

          {/* Zone Legend (floating) */}
          {zones.length > 0 && (
            <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-xl p-3 border border-border shadow-lg">
              <p className="text-xs font-medium text-muted-foreground mb-2">Zones</p>
              <div className="flex flex-wrap gap-2">
                {zones.slice(0, 4).map((zone) => (
                  <div key={zone.id} className="flex items-center gap-1.5">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: zone.color }}
                    />
                    <span className="text-xs">{zone.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Asset Detail Sheet */}
        <Sheet open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-auto">
            {selectedAsset && (
              <>
                <SheetHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      getAssetBadgeClass(selectedAsset.asset_type as any).replace('asset-badge-', 'bg-').replace('text-', '')
                    )}>
                      <AssetTypeIcon type={selectedAsset.asset_type as any} size="lg" />
                    </div>
                    <div>
                      <SheetTitle className="font-serif text-xl">
                        {selectedAsset.name}
                      </SheetTitle>
                      <p className="text-sm text-muted-foreground capitalize">
                        {selectedAsset.asset_type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </SheetHeader>

                <div className="space-y-6">
                  {/* Zone */}
                  {selectedAsset.zone && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: selectedAsset.zone.color }}
                      />
                      <span className="font-medium">{selectedAsset.zone.name}</span>
                    </div>
                  )}

                  {/* Critical Care Note */}
                  {selectedAsset.critical_care_note && (
                    <Card className="border-warning/50 bg-warning/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-warning">
                          Critical Care Note
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{selectedAsset.critical_care_note}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Purpose Tags */}
                  {selectedAsset.purpose_tags?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Purpose</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedAsset.purpose_tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risk Flags */}
                  {selectedAsset.risk_flags?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Risk Flags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedAsset.risk_flags.map((flag) => (
                          <Badge key={flag} variant="destructive" className="bg-destructive/10 text-destructive">
                            {flag.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Last Service */}
                  {selectedAsset.last_service_date && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Last Service</h4>
                      <p className="text-muted-foreground">
                        {new Date(selectedAsset.last_service_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1">View Details</Button>
                    <Button variant="outline" className="flex-1">View Tasks</Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
