import React, { useState, useEffect, useMemo } from 'react';
import { Leaf, Sparkles, Link2, Unlink, Loader2, RefreshCw, Plus, Search, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CareProtocolSheet } from '@/components/plants/CareProtocolSheet';

interface PlantProfile {
  id: string;
  common_name: string;
  scientific_name: string | null;
  category: string | null;
  care_template_json: any;
}

interface PlantInstance {
  id: string;
  plant_profile_id: string | null;
  quantity: number | null;
  density: string | null;
  notes: string | null;
  plant_profile?: PlantProfile;
}

interface PlantProfileLinkerProps {
  assetId: string;
  assetType: string;
  assetName?: string;
  onUpdate?: () => void;
}

// Check if protocol has complete detailed data in the user's language
function needsProtocolUpdate(protocol: any, userLang: 'en' | 'es'): boolean {
  if (!protocol) return false;
  
  const hasDetailedStructure = protocol && (
    (protocol.watering && typeof protocol.watering === 'object' && protocol.watering.frequency) ||
    protocol.crew_checklist ||
    protocol.do_not_do
  );
  
  if (!hasDetailedStructure) return true;
  
  const englishIndicators = ['every', 'daily', 'weekly', 'water', 'hours', 'apply', 'avoid', 'full sun', 'morning'];
  const spanishIndicators = ['cada', 'diario', 'semanal', 'riego', 'horas', 'aplicar', 'evitar', 'sol pleno', 'mañana'];
  
  const protocolString = JSON.stringify(protocol).toLowerCase();
  const englishMatches = englishIndicators.filter(word => protocolString.includes(word)).length;
  const spanishMatches = spanishIndicators.filter(word => protocolString.includes(word)).length;
  
  if (userLang === 'es' && englishMatches > spanishMatches) return true;
  if (userLang === 'en' && spanishMatches > englishMatches) return true;
  
  return false;
}

// Common plant keywords for auto-suggestion
const PLANT_KEYWORDS: Record<string, string[]> = {
  // Herbs
  'oregano': ['oregano', 'orégano'],
  'basil': ['basil', 'albahaca'],
  'rosemary': ['rosemary', 'romero'],
  'thyme': ['thyme', 'tomillo'],
  'mint': ['mint', 'menta', 'hierbabuena'],
  'cilantro': ['cilantro', 'coriander'],
  'parsley': ['parsley', 'perejil'],
  'sage': ['sage', 'salvia'],
  'lavender': ['lavender', 'lavanda'],
  // Trees
  'palm': ['palm', 'palma', 'palmera'],
  'coconut': ['coconut', 'coco'],
  'mango': ['mango'],
  'avocado': ['avocado', 'aguacate'],
  'citrus': ['citrus', 'lemon', 'orange', 'lime', 'limón', 'naranja', 'lima'],
  'banana': ['banana', 'plátano', 'banano'],
  // Ornamentals
  'bougainvillea': ['bougainvillea', 'buganvilla', 'buganvilia'],
  'hibiscus': ['hibiscus', 'hibisco'],
  'frangipani': ['frangipani', 'plumeria'],
  'bird of paradise': ['bird of paradise', 'ave del paraíso', 'strelitzia'],
  'heliconia': ['heliconia'],
  'ginger': ['ginger', 'jengibre'],
  'croton': ['croton', 'crotón'],
  'ixora': ['ixora'],
  // Ground covers / Grasses
  'vetiver': ['vetiver'],
  'lemongrass': ['lemongrass', 'zacate limón', 'hierba limón'],
  'bermuda': ['bermuda', 'bermuda grass'],
  'zoysia': ['zoysia'],
  // Fruit
  'papaya': ['papaya'],
  'pineapple': ['pineapple', 'piña'],
  'passion fruit': ['passion fruit', 'maracuyá', 'granadilla'],
  'guava': ['guava', 'guayaba'],
  // Succulents
  'aloe': ['aloe', 'sábila'],
  'agave': ['agave'],
  'cactus': ['cactus'],
};

// Suggest plant names based on asset name
function suggestPlantsFromName(assetName: string): string[] {
  const lowerName = assetName.toLowerCase();
  const suggestions: string[] = [];
  
  // Check for "herb garden" type names
  if (lowerName.includes('herb') || lowerName.includes('hierba')) {
    suggestions.push('Oregano', 'Basil', 'Rosemary', 'Thyme', 'Mint', 'Cilantro');
  }
  
  // Check for specific plant keywords
  for (const [plantName, keywords] of Object.entries(PLANT_KEYWORDS)) {
    if (keywords.some(kw => lowerName.includes(kw))) {
      const capitalized = plantName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (!suggestions.includes(capitalized)) {
        suggestions.push(capitalized);
      }
    }
  }
  
  return suggestions;
}

export function PlantProfileLinker({ assetId, assetType, assetName = '', onUpdate }: PlantProfileLinkerProps) {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<PlantProfile[]>([]);
  const [instance, setInstance] = useState<PlantInstance | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [linking, setLinking] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showCareSheet, setShowCareSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create new variety dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newVariety, setNewVariety] = useState({ common_name: '', scientific_name: '', category: 'ornamental' });
  const [creating, setCreating] = useState(false);

  const isPlantAsset = assetType === 'plant' || assetType === 'tree';
  
  // Get suggestions based on asset name
  const suggestions = useMemo(() => {
    if (!assetName) return [];
    return suggestPlantsFromName(assetName);
  }, [assetName]);

  // Filter profiles based on search
  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return profiles;
    const query = searchQuery.toLowerCase();
    return profiles.filter(p => 
      p.common_name.toLowerCase().includes(query) ||
      (p.scientific_name && p.scientific_name.toLowerCase().includes(query))
    );
  }, [profiles, searchQuery]);

  useEffect(() => {
    if (isPlantAsset) {
      fetchData();
    }
  }, [assetId, isPlantAsset]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: profilesData } = await supabase
        .from('plant_profiles')
        .select('*')
        .order('common_name');

      setProfiles(profilesData || []);

      const { data: instanceData } = await supabase
        .from('plant_instances')
        .select('*, plant_profiles:plant_profile_id(*)')
        .eq('asset_id', assetId)
        .single();

      if (instanceData) {
        setInstance({
          ...instanceData,
          plant_profile: instanceData.plant_profiles as PlantProfile
        });
        setSelectedProfileId(instanceData.plant_profile_id || '');
      }
    } catch (error) {
      // No instance found is okay
    } finally {
      setLoading(false);
    }
  }

  async function createNewVariety() {
    if (!newVariety.common_name.trim()) {
      toast.error(language === 'es' ? 'Nombre requerido' : 'Name required');
      return;
    }

    setCreating(true);
    try {
      // Create the plant profile
      const { data: profile, error } = await supabase
        .from('plant_profiles')
        .insert([{
          common_name: newVariety.common_name.trim(),
          scientific_name: newVariety.scientific_name.trim() || null,
          category: newVariety.category as 'ornamental' | 'edible' | 'structural' | 'ecological' | 'other'
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success(
        language === 'es' 
          ? `✅ Variedad "${newVariety.common_name}" creada` 
          : `✅ Variety "${newVariety.common_name}" created`
      );

      // Refresh profiles and select the new one
      await fetchData();
      setSelectedProfileId(profile.id);
      setShowCreateDialog(false);
      setNewVariety({ common_name: '', scientific_name: '', category: 'ornamental' });
      
      // Optionally auto-link it
      if (profile.id) {
        await linkProfileById(profile.id);
      }
    } catch (error: any) {
      console.error('Error creating variety:', error);
      toast.error(error.message || (language === 'es' ? 'Error al crear' : 'Failed to create'));
    } finally {
      setCreating(false);
    }
  }

  async function createAndLinkSuggestion(plantName: string) {
    // Check if profile already exists
    const existing = profiles.find(p => 
      p.common_name.toLowerCase() === plantName.toLowerCase()
    );

    if (existing) {
      await linkProfileById(existing.id);
      return;
    }

    // Create new profile
    setCreating(true);
    try {
      const { data: profile, error } = await supabase
        .from('plant_profiles')
        .insert([{
          common_name: plantName,
          category: 'ornamental'
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success(
        language === 'es' 
          ? `✅ Variedad "${plantName}" creada y vinculada` 
          : `✅ Variety "${plantName}" created and linked`
      );

      await fetchData();
      if (profile.id) {
        await linkProfileById(profile.id);
      }
    } catch (error: any) {
      console.error('Error creating variety:', error);
      toast.error(error.message || (language === 'es' ? 'Error' : 'Failed'));
    } finally {
      setCreating(false);
    }
  }

  async function linkProfileById(profileId: string) {
    setLinking(true);
    try {
      if (instance) {
        const { error } = await supabase
          .from('plant_instances')
          .update({ plant_profile_id: profileId })
          .eq('id', instance.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('plant_instances')
          .insert([{
            asset_id: assetId,
            plant_profile_id: profileId
          }]);

        if (error) throw error;
      }

      toast.success(language === 'es' ? '✅ Variedad vinculada' : '✅ Variety linked');
      fetchData();
      onUpdate?.();
    } catch (error) {
      console.error('Error linking profile:', error);
      toast.error(language === 'es' ? 'Error al vincular' : 'Failed to link');
    } finally {
      setLinking(false);
    }
  }

  async function linkProfile() {
    if (!selectedProfileId) return;
    await linkProfileById(selectedProfileId);
  }

  async function unlinkProfile() {
    if (!instance) return;

    setLinking(true);
    try {
      const { error } = await supabase
        .from('plant_instances')
        .update({ plant_profile_id: null })
        .eq('id', instance.id);

      if (error) throw error;

      toast.success(language === 'es' ? '✅ Variedad desvinculada' : '✅ Variety unlinked');
      setInstance(prev => prev ? { ...prev, plant_profile_id: null, plant_profile: undefined } : null);
      setSelectedProfileId('');
      onUpdate?.();
    } catch (error) {
      console.error('Error unlinking profile:', error);
      toast.error(language === 'es' ? 'Error al desvincular' : 'Failed to unlink');
    } finally {
      setLinking(false);
    }
  }

  async function regenerateProtocol() {
    const profile = instance?.plant_profile;
    if (!profile) return;
    
    setRegenerating(true);
    try {
      let climate = 'Tropical/Subtropical Costa Rica';
      if (currentEstate?.country === 'CR') {
        climate = 'Costa Rica - Tropical';
      }

      const { data, error } = await supabase.functions.invoke('plant-care-ai', {
        body: {
          plantName: profile.common_name,
          scientificName: profile.scientific_name,
          category: profile.category,
          climate,
          language,
          elevationZone: 'transitional',
          propertyType: 'luxury residential'
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const { error: updateError } = await supabase
        .from('plant_profiles')
        .update({ care_template_json: data.careProtocol })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      toast.success(
        language === 'es' 
          ? `✨ Protocolo regenerado para ${profile.common_name}` 
          : `✨ Protocol regenerated for ${profile.common_name}`
      );

      fetchData();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error regenerating protocol:', error);
      toast.error(error.message || (language === 'es' ? 'Error al regenerar' : 'Failed to regenerate'));
    } finally {
      setRegenerating(false);
    }
  }

  if (!isPlantAsset) return null;

  if (loading) {
    return (
      <Card className="estate-card">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const linkedProfile = instance?.plant_profile;
  const careProtocol = linkedProfile?.care_template_json as any;
  const showUpdateRecommendation = needsProtocolUpdate(careProtocol, language as 'en' | 'es');

  return (
    <>
      <Card className="estate-card border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Leaf className="h-4 w-4 text-primary" />
            {language === 'es' ? 'Perfil de Variedad' : 'Variety Profile'}
          </CardTitle>
          <CardDescription>
            {language === 'es' 
              ? 'Vincula este activo a una variedad registrada para ver su cuidado con IA' 
              : 'Link this asset to a registered variety to see AI-powered care'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {linkedProfile ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Leaf className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{linkedProfile.common_name}</p>
                  {linkedProfile.scientific_name && (
                    <p className="text-xs text-muted-foreground italic">{linkedProfile.scientific_name}</p>
                  )}
                </div>
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  {language === 'es' ? 'IA' : 'AI'}
                </Badge>
              </div>

              {showUpdateRecommendation && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-2">
                    💡 {language === 'es' 
                      ? 'Se recomienda actualizar el protocolo para obtener información más detallada y optimizada.' 
                      : 'We recommend updating the protocol for more detailed and optimized information.'}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={regenerateProtocol}
                    disabled={regenerating}
                  >
                    {regenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {language === 'es' ? 'Actualizar Protocolo' : 'Update Protocol'}
                  </Button>
                </div>
              )}

              {careProtocol && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowCareSheet(true)}
                >
                  <Sparkles className="h-4 w-4 mr-2 text-primary" />
                  {language === 'es' ? 'Ver Protocolo de Cuidados' : 'View Care Protocol'}
                </Button>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex-1"
                  onClick={regenerateProtocol}
                  disabled={regenerating}
                >
                  {regenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  {language === 'es' ? 'Regenerar' : 'Regenerate'}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 text-destructive"
                  onClick={unlinkProfile}
                  disabled={linking}
                >
                  <Unlink className="h-4 w-4 mr-1" />
                  {language === 'es' ? 'Desvincular' : 'Unlink'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Suggestions based on asset name */}
              {suggestions.length > 0 && (
                <div className="p-3 rounded-lg bg-accent/50 border border-accent">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      {language === 'es' ? 'Sugerencias automáticas' : 'Auto-suggestions'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.slice(0, 4).map(suggestion => {
                      const exists = profiles.some(p => 
                        p.common_name.toLowerCase() === suggestion.toLowerCase()
                      );
                      return (
                        <Button
                          key={suggestion}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => createAndLinkSuggestion(suggestion)}
                          disabled={creating || linking}
                        >
                          {exists ? <Link2 className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                          {suggestion}
                        </Button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {language === 'es' 
                      ? 'Click para crear y vincular automáticamente' 
                      : 'Click to create and link automatically'}
                  </p>
                </div>
              )}

              {/* Search existing varieties */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'es' ? 'Buscar variedad...' : 'Search variety...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Variety selector */}
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'es' ? 'Seleccionar variedad...' : 'Select variety...'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredProfiles.length > 0 ? (
                    filteredProfiles.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        <div className="flex items-center gap-2">
                          <Leaf className="h-4 w-4 text-primary" />
                          <span>{profile.common_name}</span>
                          {profile.care_template_json && (
                            <Sparkles className="h-3 w-3 text-primary ml-1" />
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      {language === 'es' ? 'No se encontraron variedades' : 'No varieties found'}
                    </div>
                  )}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={linkProfile}
                  disabled={!selectedProfileId || linking}
                >
                  {linking ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  {language === 'es' ? 'Vincular' : 'Link'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'es' ? 'Nueva' : 'New'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {profiles.length === 0 
                  ? (language === 'es' 
                      ? 'No hay variedades registradas. Crea una nueva.' 
                      : 'No varieties registered. Create a new one.')
                  : (language === 'es'
                      ? `${profiles.length} variedades disponibles`
                      : `${profiles.length} varieties available`)
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create New Variety Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'es' ? 'Nueva Variedad de Planta' : 'New Plant Variety'}
            </DialogTitle>
            <DialogDescription>
              {language === 'es' 
                ? 'Agrega una nueva variedad al registro. La IA generará automáticamente su protocolo de cuidados.' 
                : 'Add a new variety to the registry. AI will automatically generate its care protocol.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === 'es' ? 'Nombre Común *' : 'Common Name *'}</Label>
              <Input
                placeholder={language === 'es' ? 'Ej: Orégano Mexicano' : 'E.g.: Mexican Oregano'}
                value={newVariety.common_name}
                onChange={(e) => setNewVariety(prev => ({ ...prev, common_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'es' ? 'Nombre Científico' : 'Scientific Name'}</Label>
              <Input
                placeholder={language === 'es' ? 'Ej: Lippia graveolens' : 'E.g.: Lippia graveolens'}
                value={newVariety.scientific_name}
                onChange={(e) => setNewVariety(prev => ({ ...prev, scientific_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'es' ? 'Categoría' : 'Category'}</Label>
              <Select 
                value={newVariety.category} 
                onValueChange={(val) => setNewVariety(prev => ({ ...prev, category: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ornamental">{language === 'es' ? 'Ornamental' : 'Ornamental'}</SelectItem>
                  <SelectItem value="edible">{language === 'es' ? 'Comestible' : 'Edible'}</SelectItem>
                  <SelectItem value="structural">{language === 'es' ? 'Estructural' : 'Structural'}</SelectItem>
                  <SelectItem value="ecological">{language === 'es' ? 'Ecológica' : 'Ecological'}</SelectItem>
                  <SelectItem value="other">{language === 'es' ? 'Otra' : 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button onClick={createNewVariety} disabled={creating || !newVariety.common_name.trim()}>
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {language === 'es' ? 'Crear y Vincular' : 'Create & Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Care Protocol Sheet */}
      <CareProtocolSheet
        open={showCareSheet}
        onOpenChange={setShowCareSheet}
        plantName={linkedProfile?.common_name || ''}
        scientificName={linkedProfile?.scientific_name || undefined}
        careProtocol={careProtocol}
      />
    </>
  );
}
