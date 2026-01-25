import React, { useState, useEffect } from 'react';
import { Leaf, Sparkles, Link2, Unlink, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  onUpdate?: () => void;
}

// Check if protocol has complete detailed data in the user's language
function needsProtocolUpdate(protocol: any, userLang: 'en' | 'es'): boolean {
  if (!protocol) return false; // No protocol at all - different case
  
  // Check if has detailed structure
  const hasDetailedStructure = protocol && (
    (protocol.watering && typeof protocol.watering === 'object' && protocol.watering.frequency) ||
    protocol.crew_checklist ||
    protocol.do_not_do
  );
  
  if (!hasDetailedStructure) return true; // Basic protocol, needs update
  
  // Detect language mismatch
  const englishIndicators = ['every', 'daily', 'weekly', 'water', 'hours', 'apply', 'avoid', 'full sun', 'morning'];
  const spanishIndicators = ['cada', 'diario', 'semanal', 'riego', 'horas', 'aplicar', 'evitar', 'sol pleno', 'mañana'];
  
  const protocolString = JSON.stringify(protocol).toLowerCase();
  const englishMatches = englishIndicators.filter(word => protocolString.includes(word)).length;
  const spanishMatches = spanishIndicators.filter(word => protocolString.includes(word)).length;
  
  // If language mismatch detected, needs update
  if (userLang === 'es' && englishMatches > spanishMatches) return true;
  if (userLang === 'en' && spanishMatches > englishMatches) return true;
  
  return false;
}

export function PlantProfileLinker({ assetId, assetType, onUpdate }: PlantProfileLinkerProps) {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<PlantProfile[]>([]);
  const [instance, setInstance] = useState<PlantInstance | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [linking, setLinking] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
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

  async function regenerateProtocol() {
    const profile = instance?.plant_profile;
    if (!profile) return;
    
    setRegenerating(true);
    try {
      // Determine climate based on estate location
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
          elevationZone: 'transitional', // Default to central valley
          propertyType: 'luxury residential'
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Update the plant profile with new care protocol
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

      // Refresh data
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

              {/* Platform recommendation to update protocol */}
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
