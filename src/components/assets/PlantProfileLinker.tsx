import React, { useState, useEffect } from 'react';
import { Leaf, Sparkles, Link2, Unlink, Loader2, Droplets, Sun, Scissors, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  onUpdate?: () => void;
}

interface CareProtocol {
  watering?: { frequency?: string; amount?: string; method?: string } | string;
  sunlight?: { requirement?: string; hours?: string } | string;
  pruning?: { frequency?: string; timing?: string } | string;
  fertilizer?: string;
  do_not_do?: string[];
}

export function PlantProfileLinker({ assetId, assetType, onUpdate }: PlantProfileLinkerProps) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<PlantProfile[]>([]);
  const [instance, setInstance] = useState<PlantInstance | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [linking, setLinking] = useState(false);
  const [showCareSheet, setShowCareSheet] = useState(false);

  // Only show for plant/tree assets
  const isPlantAsset = assetType === 'plant' || assetType === 'tree';

  useEffect(() => {
    if (isPlantAsset) {
      fetchData();
    }
  }, [assetId, isPlantAsset]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch all plant profiles
      const { data: profilesData } = await supabase
        .from('plant_profiles')
        .select('*')
        .order('common_name');

      setProfiles(profilesData || []);

      // Fetch existing plant instance for this asset
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

  async function linkProfile() {
    if (!selectedProfileId) return;

    setLinking(true);
    try {
      if (instance) {
        // Update existing instance
        const { error } = await supabase
          .from('plant_instances')
          .update({ plant_profile_id: selectedProfileId })
          .eq('id', instance.id);

        if (error) throw error;
      } else {
        // Create new instance
        const { error } = await supabase
          .from('plant_instances')
          .insert([{
            asset_id: assetId,
            plant_profile_id: selectedProfileId
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
  const careProtocol = linkedProfile?.care_template_json as CareProtocol | undefined;

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

              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-destructive"
                onClick={unlinkProfile}
                disabled={linking}
              >
                <Unlink className="h-4 w-4 mr-1" />
                {language === 'es' ? 'Desvincular Variedad' : 'Unlink Variety'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'es' ? 'Seleccionar variedad...' : 'Select variety...'} />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      <div className="flex items-center gap-2">
                        <Leaf className="h-4 w-4 text-primary" />
                        <span>{profile.common_name}</span>
                        {profile.care_template_json && (
                          <Sparkles className="h-3 w-3 text-primary ml-1" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                className="w-full"
                onClick={linkProfile}
                disabled={!selectedProfileId || linking}
              >
                {linking ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                {language === 'es' ? 'Vincular Variedad' : 'Link Variety'}
              </Button>

              {profiles.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {language === 'es' 
                    ? 'No hay variedades registradas. Ve al Registro de Plantas para agregar.' 
                    : 'No varieties registered. Go to Plant Registry to add.'}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Care Protocol Sheet */}
      <Sheet open={showCareSheet} onOpenChange={setShowCareSheet}>
        <SheetContent className="w-full sm:max-w-lg overflow-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {language === 'es' ? 'Protocolo de Cuidados IA' : 'AI Care Protocol'}
            </SheetTitle>
            {linkedProfile && (
              <p className="text-sm text-muted-foreground">
                {linkedProfile.common_name}
                {linkedProfile.scientific_name && ` (${linkedProfile.scientific_name})`}
              </p>
            )}
          </SheetHeader>

          {careProtocol && (
            <div className="mt-6 space-y-4">
              {/* Watering */}
              {careProtocol.watering && (
                <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-primary" />
                    {language === 'es' ? 'Riego' : 'Watering'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {typeof careProtocol.watering === 'object' ? (
                    <>
                      {careProtocol.watering.frequency && <p><strong>{language === 'es' ? 'Frecuencia:' : 'Frequency:'}</strong> {careProtocol.watering.frequency}</p>}
                      {careProtocol.watering.amount && <p><strong>{language === 'es' ? 'Cantidad:' : 'Amount:'}</strong> {careProtocol.watering.amount}</p>}
                      {careProtocol.watering.method && <p><strong>{language === 'es' ? 'Método:' : 'Method:'}</strong> {careProtocol.watering.method}</p>}
                    </>
                  ) : (
                    <p>{careProtocol.watering}</p>
                  )}
                </CardContent>
              </Card>
              )}

              {/* Sunlight */}
              {careProtocol.sunlight && (
                <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sun className="h-4 w-4 text-warning" />
                    {language === 'es' ? 'Luz Solar' : 'Sunlight'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {typeof careProtocol.sunlight === 'object' ? (
                    <>
                      {careProtocol.sunlight.requirement && <p><strong>{language === 'es' ? 'Requisito:' : 'Requirement:'}</strong> {careProtocol.sunlight.requirement}</p>}
                      {careProtocol.sunlight.hours && <p><strong>{language === 'es' ? 'Horas:' : 'Hours:'}</strong> {careProtocol.sunlight.hours}</p>}
                    </>
                  ) : (
                    <p>{careProtocol.sunlight}</p>
                  )}
                </CardContent>
              </Card>
              )}

              {/* Pruning */}
              {careProtocol.pruning && (
                <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-primary" />
                    {language === 'es' ? 'Poda' : 'Pruning'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {typeof careProtocol.pruning === 'object' ? (
                    <>
                      {careProtocol.pruning.frequency && <p><strong>{language === 'es' ? 'Frecuencia:' : 'Frequency:'}</strong> {careProtocol.pruning.frequency}</p>}
                      {careProtocol.pruning.timing && <p><strong>{language === 'es' ? 'Época:' : 'Timing:'}</strong> {careProtocol.pruning.timing}</p>}
                    </>
                  ) : (
                    <p>{careProtocol.pruning}</p>
                  )}
                </CardContent>
              </Card>
              )}

              {/* Fertilizer (legacy format) */}
              {careProtocol.fertilizer && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {language === 'es' ? 'Fertilización' : 'Fertilizer'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p>{careProtocol.fertilizer}</p>
                  </CardContent>
                </Card>
              )}

              {/* Do Not Do */}
              {careProtocol.do_not_do && careProtocol.do_not_do.length > 0 && (
                <Card className="border-destructive/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      {language === 'es' ? 'No Hacer' : 'Do Not Do'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2">
                      {careProtocol.do_not_do.map((warning, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-destructive">
                          <span className="mt-1">⚠️</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
