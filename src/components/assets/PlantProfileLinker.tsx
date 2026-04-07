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
import { getCareProtocolForLanguage, needsCareProtocolForLanguage, setCareProtocolForLanguage, type CareProtocolLanguage } from '@/lib/careProtocol';

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

const PLANT_KEYWORDS: Record<string, string[]> = {
  oregano: ['oregano', 'orégano'], basil: ['basil', 'albahaca'], rosemary: ['rosemary', 'romero'], thyme: ['thyme', 'tomillo'], mint: ['mint', 'menta', 'hierbabuena'], cilantro: ['cilantro', 'coriander'], parsley: ['parsley', 'perejil'], sage: ['sage', 'salvia'], lavender: ['lavender', 'lavanda'], palm: ['palm', 'palma', 'palmera'], coconut: ['coconut', 'coco'], mango: ['mango'], avocado: ['avocado', 'aguacate'], citrus: ['citrus', 'lemon', 'orange', 'lime', 'limón', 'naranja', 'lima'], banana: ['banana', 'plátano', 'banano'], bougainvillea: ['bougainvillea', 'buganvilla', 'buganvilia'], hibiscus: ['hibiscus', 'hibisco'], frangipani: ['frangipani', 'plumeria'], 'bird of paradise': ['bird of paradise', 'ave del paraíso', 'strelitzia'], heliconia: ['heliconia'], ginger: ['ginger', 'jengibre'], croton: ['croton', 'crotón'], ixora: ['ixora'], vetiver: ['vetiver'], lemongrass: ['lemongrass', 'zacate limón', 'hierba limón'], bermuda: ['bermuda', 'bermuda grass'], zoysia: ['zoysia'], papaya: ['papaya'], pineapple: ['pineapple', 'piña'], 'passion fruit': ['passion fruit', 'maracuyá', 'granadilla'], guava: ['guava', 'guayaba'], aloe: ['aloe', 'sábila'], agave: ['agave'], cactus: ['cactus'],
};

function suggestPlantsFromName(assetName: string): string[] {
  const lowerName = assetName.toLowerCase();
  const suggestions: string[] = [];
  if (lowerName.includes('herb') || lowerName.includes('hierba')) suggestions.push('Oregano', 'Basil', 'Rosemary', 'Thyme', 'Mint', 'Cilantro');
  for (const [plantName, keywords] of Object.entries(PLANT_KEYWORDS)) {
    if (keywords.some((kw) => lowerName.includes(kw))) {
      const capitalized = plantName.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (!suggestions.includes(capitalized)) suggestions.push(capitalized);
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newVariety, setNewVariety] = useState({ common_name: '', scientific_name: '', category: 'ornamental' });
  const [creating, setCreating] = useState(false);

  const isPlantAsset = assetType === 'plant' || assetType === 'tree';
  const currentLanguage = (language === 'de' ? 'de' : language === 'es' ? 'es' : 'en') as CareProtocolLanguage;

  const suggestions = useMemo(() => (assetName ? suggestPlantsFromName(assetName) : []), [assetName]);
  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return profiles;
    const query = searchQuery.toLowerCase();
    return profiles.filter((p) => p.common_name.toLowerCase().includes(query) || (p.scientific_name && p.scientific_name.toLowerCase().includes(query)));
  }, [profiles, searchQuery]);

  useEffect(() => {
    if (isPlantAsset) fetchData();
  }, [assetId, isPlantAsset]);

  useEffect(() => {
    const linkedProfile = instance?.plant_profile;
    if (!linkedProfile?.care_template_json || regenerating) return;
    if (!needsCareProtocolForLanguage(linkedProfile.care_template_json, currentLanguage)) return;
    regenerateProtocol({ silent: true });
  }, [instance?.plant_profile?.id, currentLanguage]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: profilesData } = await supabase.from('plant_profiles').select('*').order('common_name');
      setProfiles(profilesData || []);
      const { data: instanceData } = await supabase.from('plant_instances').select('*, plant_profiles:plant_profile_id(*)').eq('asset_id', assetId).single();
      if (instanceData) {
        setInstance({ ...instanceData, plant_profile: instanceData.plant_profiles as PlantProfile });
        setSelectedProfileId(instanceData.plant_profile_id || '');
      }
    } finally {
      setLoading(false);
    }
  }

  async function createNewVariety() {
    if (!newVariety.common_name.trim()) {
      toast.error(language === 'es' ? 'Nombre requerido' : language === 'de' ? 'Name erforderlich' : 'Name required');
      return;
    }
    setCreating(true);
    try {
      const { data: profile, error } = await supabase.from('plant_profiles').insert([{ common_name: newVariety.common_name.trim(), scientific_name: newVariety.scientific_name.trim() || null, category: newVariety.category as any }]).select().single();
      if (error) throw error;
      toast.success(language === 'es' ? `✅ Variedad "${newVariety.common_name}" creada` : language === 'de' ? `✅ Sorte "${newVariety.common_name}" erstellt` : `✅ Variety "${newVariety.common_name}" created`);
      await fetchData();
      setSelectedProfileId(profile.id);
      setShowCreateDialog(false);
      setNewVariety({ common_name: '', scientific_name: '', category: 'ornamental' });
      if (profile.id) await linkProfileById(profile.id);
    } catch (error: any) {
      toast.error(error.message || (language === 'es' ? 'Error al crear' : language === 'de' ? 'Erstellen fehlgeschlagen' : 'Failed to create'));
    } finally {
      setCreating(false);
    }
  }

  async function createAndLinkSuggestion(plantName: string) {
    const existing = profiles.find((p) => p.common_name.toLowerCase() === plantName.toLowerCase());
    if (existing) return linkProfileById(existing.id);
    setCreating(true);
    try {
      const { data: profile, error } = await supabase.from('plant_profiles').insert([{ common_name: plantName, category: 'ornamental' }]).select().single();
      if (error) throw error;
      toast.success(language === 'es' ? `✅ Variedad "${plantName}" creada y vinculada` : language === 'de' ? `✅ Sorte "${plantName}" erstellt und verknüpft` : `✅ Variety "${plantName}" created and linked`);
      await fetchData();
      if (profile.id) await linkProfileById(profile.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed');
    } finally {
      setCreating(false);
    }
  }

  async function linkProfileById(profileId: string) {
    setLinking(true);
    try {
      if (instance) {
        const { error } = await supabase.from('plant_instances').update({ plant_profile_id: profileId }).eq('id', instance.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('plant_instances').insert([{ asset_id: assetId, plant_profile_id: profileId }]);
        if (error) throw error;
      }
      toast.success(language === 'es' ? '✅ Variedad vinculada' : language === 'de' ? '✅ Sorte verknüpft' : '✅ Variety linked');
      await fetchData();
      onUpdate?.();
    } catch {
      toast.error(language === 'es' ? 'Error al vincular' : language === 'de' ? 'Verknüpfen fehlgeschlagen' : 'Failed to link');
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
      const { error } = await supabase.from('plant_instances').update({ plant_profile_id: null }).eq('id', instance.id);
      if (error) throw error;
      toast.success(language === 'es' ? '✅ Variedad desvinculada' : language === 'de' ? '✅ Sorte entfernt' : '✅ Variety unlinked');
      setInstance((prev) => (prev ? { ...prev, plant_profile_id: null, plant_profile: undefined } : null));
      setSelectedProfileId('');
      onUpdate?.();
    } catch {
      toast.error(language === 'es' ? 'Error al desvincular' : language === 'de' ? 'Trennen fehlgeschlagen' : 'Failed to unlink');
    } finally {
      setLinking(false);
    }
  }

  async function regenerateProtocol(options?: { silent?: boolean }) {
    const profile = instance?.plant_profile;
    if (!profile) return;
    setRegenerating(true);
    try {
      let climate = 'Tropical/Subtropical Costa Rica';
      if (currentEstate?.country === 'CR') climate = 'Costa Rica - Tropical';
      const { data, error } = await supabase.functions.invoke('plant-care-ai', {
        body: {
          plantName: profile.common_name,
          scientificName: profile.scientific_name,
          category: profile.category,
          climate,
          language: currentLanguage,
          elevationZone: 'transitional',
          propertyType: 'luxury residential',
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      const localizedPayload = setCareProtocolForLanguage(profile.care_template_json, currentLanguage, data.careProtocol);
      const { error: updateError } = await supabase.from('plant_profiles').update({ care_template_json: localizedPayload }).eq('id', profile.id);
      if (updateError) throw updateError;
      if (!options?.silent) {
        toast.success(language === 'es' ? `✨ Protocolo actualizado para ${profile.common_name}` : language === 'de' ? `✨ Protokoll aktualisiert für ${profile.common_name}` : `✨ Protocol updated for ${profile.common_name}`);
      }
      await fetchData();
      onUpdate?.();
    } catch (error: any) {
      if (!options?.silent) toast.error(error.message || (language === 'es' ? 'Error al actualizar' : language === 'de' ? 'Aktualisierung fehlgeschlagen' : 'Failed to update'));
    } finally {
      setRegenerating(false);
    }
  }

  if (!isPlantAsset) return null;
  if (loading) return <Card className="estate-card"><CardContent className="py-6 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>;

  const linkedProfile = instance?.plant_profile;
  const careProtocol = linkedProfile?.care_template_json as any;
  const resolvedProtocol = getCareProtocolForLanguage(careProtocol, currentLanguage);
  const showUpdateRecommendation = linkedProfile?.care_template_json && needsCareProtocolForLanguage(linkedProfile.care_template_json, currentLanguage);

  return (
    <>
      <Card className="estate-card border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Leaf className="h-4 w-4 text-primary" />{language === 'es' ? 'Perfil de Variedad' : language === 'de' ? 'Sortenprofil' : 'Variety Profile'}</CardTitle>
          <CardDescription>{language === 'es' ? 'Vincula este activo a una variedad registrada para ver su protocolo de cuidados' : language === 'de' ? 'Verknüpfe dieses Asset mit einer registrierten Sorte, um das Pflegeprotokoll zu sehen' : 'Link this asset to a registered variety to view its care protocol'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {linkedProfile ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Leaf className="h-5 w-5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{linkedProfile.common_name}</p>
                  {linkedProfile.scientific_name && <p className="text-xs text-muted-foreground italic">{linkedProfile.scientific_name}</p>}
                </div>
                {resolvedProtocol && <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" />{currentLanguage.toUpperCase()}</Badge>}
              </div>

              {showUpdateRecommendation && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-2">💡 {language === 'es' ? 'Estamos actualizando este protocolo al idioma seleccionado.' : language === 'de' ? 'Dieses Protokoll wird auf die ausgewählte Sprache aktualisiert.' : 'We are updating this protocol to the selected language.'}</p>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => regenerateProtocol()} disabled={regenerating}>
                    {regenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    {language === 'es' ? 'Actualizar idioma del protocolo' : language === 'de' ? 'Protokollsprache aktualisieren' : 'Update protocol language'}
                  </Button>
                </div>
              )}

              {careProtocol && <Button variant="outline" className="w-full" onClick={() => setShowCareSheet(true)}><Sparkles className="h-4 w-4 mr-2 text-primary" />{language === 'es' ? 'Ver Protocolo de Cuidados' : language === 'de' ? 'Pflegeprotokoll ansehen' : 'View Care Protocol'}</Button>}

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => regenerateProtocol()} disabled={regenerating}>{regenerating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}{language === 'es' ? 'Regenerar' : language === 'de' ? 'Neu generieren' : 'Regenerate'}</Button>
                <Button variant="ghost" size="sm" className="flex-1 text-destructive" onClick={unlinkProfile} disabled={linking}><Unlink className="h-4 w-4 mr-1" />{language === 'es' ? 'Desvincular' : language === 'de' ? 'Trennen' : 'Unlink'}</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.length > 0 && <div className="p-3 rounded-lg bg-accent/50 border border-accent"><div className="flex items-center gap-2 mb-2"><Lightbulb className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{language === 'es' ? 'Sugerencias automáticas' : language === 'de' ? 'Automatische Vorschläge' : 'Auto-suggestions'}</span></div><div className="flex flex-wrap gap-2">{suggestions.slice(0, 4).map((suggestion) => { const exists = profiles.some((p) => p.common_name.toLowerCase() === suggestion.toLowerCase()); return <Button key={suggestion} variant="outline" size="sm" className="h-7 text-xs" onClick={() => createAndLinkSuggestion(suggestion)} disabled={creating || linking}>{exists ? <Link2 className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}{suggestion}</Button>; })}</div><p className="text-xs text-muted-foreground mt-2">{language === 'es' ? 'Click para crear y vincular automáticamente' : language === 'de' ? 'Klicken zum automatischen Erstellen und Verknüpfen' : 'Click to create and link automatically'}</p></div>}
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={language === 'es' ? 'Buscar variedad...' : language === 'de' ? 'Sorte suchen...' : 'Search variety...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}><SelectTrigger><SelectValue placeholder={language === 'es' ? 'Seleccionar variedad...' : language === 'de' ? 'Sorte auswählen...' : 'Select variety...'} /></SelectTrigger><SelectContent>{filteredProfiles.length > 0 ? filteredProfiles.map((profile) => <SelectItem key={profile.id} value={profile.id}><div className="flex items-center gap-2"><Leaf className="h-4 w-4 text-primary" /><span>{profile.common_name}</span>{profile.care_template_json && <Sparkles className="h-3 w-3 text-primary ml-1" />}</div></SelectItem>) : <div className="px-2 py-4 text-center text-sm text-muted-foreground">{language === 'es' ? 'No se encontraron variedades' : language === 'de' ? 'Keine Sorten gefunden' : 'No varieties found'}</div>}</SelectContent></Select>
              <div className="flex gap-2"><Button className="flex-1" onClick={linkProfile} disabled={!selectedProfileId || linking}>{linking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}{language === 'es' ? 'Vincular' : language === 'de' ? 'Verknüpfen' : 'Link'}</Button><Button variant="outline" onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />{language === 'es' ? 'Nueva' : language === 'de' ? 'Neu' : 'New'}</Button></div>
              <p className="text-xs text-muted-foreground text-center">{profiles.length === 0 ? (language === 'es' ? 'No hay variedades registradas. Crea una nueva.' : language === 'de' ? 'Keine Sorten registriert. Erstelle eine neue.' : 'No varieties registered. Create a new one.') : (language === 'es' ? `${profiles.length} variedades disponibles` : language === 'de' ? `${profiles.length} Sorten verfügbar` : `${profiles.length} varieties available`)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}><DialogContent><DialogHeader><DialogTitle>{language === 'es' ? 'Nueva Variedad de Planta' : language === 'de' ? 'Neue Pflanzensorte' : 'New Plant Variety'}</DialogTitle><DialogDescription>{language === 'es' ? 'Agrega una nueva variedad al registro. Se generará automáticamente su protocolo de cuidados.' : language === 'de' ? 'Füge dem Register eine neue Sorte hinzu. Das Pflegeprotokoll wird automatisch erstellt.' : 'Add a new variety to the registry. Its care protocol will be generated automatically.'}</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label>{language === 'es' ? 'Nombre Común *' : language === 'de' ? 'Trivialname *' : 'Common Name *'}</Label><Input placeholder={language === 'es' ? 'Ej: Orégano Mexicano' : 'E.g.: Mexican Oregano'} value={newVariety.common_name} onChange={(e) => setNewVariety((prev) => ({ ...prev, common_name: e.target.value }))} /></div><div className="space-y-2"><Label>{language === 'es' ? 'Nombre Científico' : language === 'de' ? 'Wissenschaftlicher Name' : 'Scientific Name'}</Label><Input placeholder="Lippia graveolens" value={newVariety.scientific_name} onChange={(e) => setNewVariety((prev) => ({ ...prev, scientific_name: e.target.value }))} /></div><div className="space-y-2"><Label>{language === 'es' ? 'Categoría' : language === 'de' ? 'Kategorie' : 'Category'}</Label><Select value={newVariety.category} onValueChange={(val) => setNewVariety((prev) => ({ ...prev, category: val }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ornamental">{language === 'es' ? 'Ornamental' : language === 'de' ? 'Zierpflanze' : 'Ornamental'}</SelectItem><SelectItem value="edible">{language === 'es' ? 'Comestible' : language === 'de' ? 'Essbar' : 'Edible'}</SelectItem><SelectItem value="structural">{language === 'es' ? 'Estructural' : language === 'de' ? 'Strukturell' : 'Structural'}</SelectItem><SelectItem value="ecological">{language === 'es' ? 'Ecológica' : language === 'de' ? 'Ökologisch' : 'Ecological'}</SelectItem><SelectItem value="other">{language === 'es' ? 'Otra' : language === 'de' ? 'Andere' : 'Other'}</SelectItem></SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setShowCreateDialog(false)}>{language === 'es' ? 'Cancelar' : language === 'de' ? 'Abbrechen' : 'Cancel'}</Button><Button onClick={createNewVariety} disabled={creating || !newVariety.common_name.trim()}>{creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}{language === 'es' ? 'Crear y Vincular' : language === 'de' ? 'Erstellen & Verknüpfen' : 'Create & Link'}</Button></DialogFooter></DialogContent></Dialog>

      <CareProtocolSheet open={showCareSheet} onOpenChange={setShowCareSheet} plantName={linkedProfile?.common_name || ''} scientificName={linkedProfile?.scientific_name || undefined} careProtocol={careProtocol} loading={regenerating && !resolvedProtocol} />
    </>
  );
}
