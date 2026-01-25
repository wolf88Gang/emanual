import React, { useState, useEffect } from 'react';
import { Leaf, Sparkles, Link2, Unlink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
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
  onUpdate?: () => void;
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
  const careProtocol = linkedProfile?.care_template_json as any;

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

      {/* Care Protocol Sheet - Using new enhanced component */}
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
