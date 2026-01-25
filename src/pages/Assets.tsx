import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus,
  Grid3X3,
  List,
  ChevronRight,
  AlertTriangle,
  QrCode,
  Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AssetTypeIcon, getAssetBadgeClass } from '@/components/icons/AssetTypeIcon';

interface Asset {
  id: string;
  name: string;
  description: string | null;
  asset_type: string;
  zone_id: string | null;
  zone?: {
    id: string;
    name: string;
    color: string;
  };
  purpose_tags: string[];
  risk_flags: string[];
  critical_care_note: string | null;
  do_not_do_warnings: string | null;
  last_service_date: string | null;
  install_date: string | null;
  photos?: { url: string }[];
}

const assetTypeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'plant', label: 'Plants' },
  { value: 'tree', label: 'Trees' },
  { value: 'irrigation_controller', label: 'Irrigation Controllers' },
  { value: 'valve', label: 'Valves' },
  { value: 'lighting_transformer', label: 'Lighting' },
  { value: 'hardscape', label: 'Hardscape' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'structure', label: 'Structures' },
];

export default function Assets() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { currentEstate } = useEstate();
  const { isOwnerOrManager } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (currentEstate) {
      fetchAssets();
    }
  }, [currentEstate]);

  async function fetchAssets() {
    if (!currentEstate) return;
    
    setLoading(true);
    try {
      const [assetsRes, zonesRes] = await Promise.all([
        supabase
          .from('assets')
          .select(`
            *,
            zones:zone_id (id, name, color),
            asset_photos (url)
          `)
          .eq('estate_id', currentEstate.id)
          .order('name'),
        supabase
          .from('zones')
          .select('id, name, color')
          .eq('estate_id', currentEstate.id)
          .order('name'),
      ]);

      setAssets((assetsRes.data || []).map(a => ({
        ...a,
        zone: a.zones as Asset['zone'],
        photos: a.asset_photos as Asset['photos'],
      })));
      setZones(zonesRes.data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAssets = assets.filter(asset => {
    if (filterType !== 'all' && asset.asset_type !== filterType) return false;
    if (filterZone !== 'all' && asset.zone_id !== filterZone) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        asset.name.toLowerCase().includes(query) ||
        asset.description?.toLowerCase().includes(query) ||
        asset.purpose_tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const hasRiskFlags = (asset: Asset) => asset.risk_flags && asset.risk_flags.length > 0;

  return (
    <AppLayout>
      <div className="container py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-serif font-semibold">{t('assets.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {assets.length} assets across {zones.length} zones
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <QrCode className="h-4 w-4" />
            </Button>
            {isOwnerOrManager && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {assetTypeOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterZone} onValueChange={setFilterZone}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {zones.map(zone => (
                <SelectItem key={zone.id} value={zone.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: zone.color }}
                    />
                    {zone.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-input p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Assets */}
        {loading ? (
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-3'
          )}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className={cn(
                'rounded-xl shimmer',
                viewMode === 'grid' ? 'h-48' : 'h-24'
              )} />
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <Card className="estate-card">
            <CardContent className="py-12 text-center">
              <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg">No assets found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery || filterType !== 'all' || filterZone !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start by adding your first asset'}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAssets.map((asset) => (
              <Card key={asset.id} className="estate-card overflow-hidden cursor-pointer group" onClick={() => navigate(`/assets/${asset.id}`)}>
                {/* Image / Icon header */}
                <div className="h-32 bg-gradient-to-br from-secondary to-muted flex items-center justify-center relative">
                  {asset.photos && asset.photos[0] ? (
                    <img 
                      src={asset.photos[0].url} 
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <AssetTypeIcon type={asset.asset_type as any} size="lg" className="h-12 w-12 opacity-50" />
                  )}
                  {hasRiskFlags(asset) && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Risk
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{asset.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {asset.asset_type.replace('_', ' ')}
                      </p>
                    </div>
                    <AssetTypeIcon type={asset.asset_type as any} size="sm" />
                  </div>
                  {asset.zone && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: asset.zone.color }}
                      />
                      <span className="text-xs text-muted-foreground truncate">
                        {asset.zone.name}
                      </span>
                    </div>
                  )}
                  {asset.purpose_tags && asset.purpose_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {asset.purpose_tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {asset.purpose_tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{asset.purpose_tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAssets.map((asset) => (
              <Card key={asset.id} className="estate-card cursor-pointer" onClick={() => navigate(`/assets/${asset.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                      {asset.photos && asset.photos[0] ? (
                        <img 
                          src={asset.photos[0].url} 
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <AssetTypeIcon type={asset.asset_type as any} size="lg" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{asset.name}</h3>
                        {hasRiskFlags(asset) && (
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        {asset.asset_type.replace('_', ' ')}
                        {asset.zone && ` • ${asset.zone.name}`}
                      </p>
                      {asset.critical_care_note && (
                        <p className="text-xs text-warning mt-1 line-clamp-1">
                          {asset.critical_care_note}
                        </p>
                      )}
                    </div>

                    {/* Zone indicator */}
                    {asset.zone && (
                      <div 
                        className="w-3 h-12 rounded-full shrink-0"
                        style={{ backgroundColor: asset.zone.color }}
                      />
                    )}

                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
