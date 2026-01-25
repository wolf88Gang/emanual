import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Sparkles, Plus, Search, Loader2, AlertTriangle, Droplets, Sun, Scissors, Mountain, Waves, TreeDeciduous } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CareProtocolSheet } from '@/components/plants/CareProtocolSheet';

interface PlantProfile {
  id: string;
  common_name: string;
  scientific_name: string | null;
  category: string | null;
  native_status: string | null;
  image_url: string | null;
  care_template_json: any;
}

export default function PlantRegistry() {
  const { language, t } = useLanguage();
  const { currentEstate } = useEstate();
  const navigate = useNavigate();
  
  const [profiles, setProfiles] = useState<PlantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<PlantProfile | null>(null);
  const [showCareSheet, setShowCareSheet] = useState(false);
  
  // New plant form with elevation zone
  const [newPlant, setNewPlant] = useState({
    common_name: '',
    scientific_name: '',
    category: 'ornamental',
    native_status: 'exotic',
    elevation_zone: 'transitional' // coastal, transitional, highland
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    try {
      const { data, error } = await supabase
        .from('plant_profiles')
        .select('*')
        .order('common_name');
      
      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching plant profiles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateCareProtocol() {
    if (!newPlant.common_name.trim()) {
      toast.error(language === 'es' ? 'Ingrese el nombre de la planta' : 'Enter plant name');
      return;
    }

    setGenerating(true);
    try {
      // Determine climate based on estate location
      let climate = 'Tropical/Subtropical Costa Rica';
      if (currentEstate?.country === 'CR') {
        climate = 'Costa Rica - Tropical';
      } else if (currentEstate?.country === 'PR') {
        climate = 'Tropical Caribbean';
      }

      const { data, error } = await supabase.functions.invoke('plant-care-ai', {
        body: {
          plantName: newPlant.common_name,
          scientificName: newPlant.scientific_name,
          category: newPlant.category,
          climate,
          language,
          elevationZone: newPlant.elevation_zone,
          propertyType: 'luxury residential'
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Save to database
      const { data: profile, error: insertError } = await supabase
        .from('plant_profiles')
        .insert([{
          common_name: newPlant.common_name,
          scientific_name: newPlant.scientific_name || null,
          category: newPlant.category as 'ornamental' | 'edible' | 'structural' | 'ecological' | 'other',
          native_status: newPlant.native_status as 'native' | 'naturalized' | 'exotic' | 'invasive',
          care_template_json: data.careProtocol
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success(
        language === 'es' 
          ? `✨ Protocolo de cuidado generado para ${newPlant.common_name}` 
          : `✨ Care protocol generated for ${newPlant.common_name}`
      );

      setProfiles(prev => [...prev, profile]);
      setShowAddSheet(false);
      setNewPlant({ common_name: '', scientific_name: '', category: 'ornamental', native_status: 'exotic', elevation_zone: 'transitional' });
      setSelectedProfile(profile);
      setShowCareSheet(true);
    } catch (error: any) {
      console.error('Error generating care protocol:', error);
      toast.error(error.message || (language === 'es' ? 'Error al generar protocolo' : 'Failed to generate protocol'));
    } finally {
      setGenerating(false);
    }
  }

  const filteredProfiles = profiles.filter(p => 
    p.common_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.scientific_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categoryLabels: Record<string, { en: string; es: string }> = {
    ornamental: { en: 'Ornamental', es: 'Ornamental' },
    edible: { en: 'Edible', es: 'Comestible' },
    structural: { en: 'Structural', es: 'Estructural' },
    ecological: { en: 'Ecological', es: 'Ecológico' },
    other: { en: 'Other', es: 'Otro' }
  };

  return (
    <ModernAppLayout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold">
              {language === 'es' ? 'Registro de Variedades' : 'Plant Registry'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {language === 'es' 
                ? 'Registra nuevas variedades y obtén cuidados con IA' 
                : 'Register new varieties and get AI-powered care'}
            </p>
          </div>
          <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
            <SheetTrigger asChild>
              <Button className="gap-2">
                <Sparkles className="h-4 w-4" />
                {language === 'es' ? 'Nueva Variedad' : 'New Variety'}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-primary" />
                  {language === 'es' ? 'Registrar Nueva Variedad' : 'Register New Variety'}
                </SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>{language === 'es' ? 'Nombre Común *' : 'Common Name *'}</Label>
                  <Input
                    placeholder={language === 'es' ? 'Ej: Heliconia Rostrata' : 'E.g., Bird of Paradise'}
                    value={newPlant.common_name}
                    onChange={(e) => setNewPlant(p => ({ ...p, common_name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{language === 'es' ? 'Nombre Científico' : 'Scientific Name'}</Label>
                  <Input
                    placeholder="Strelitzia reginae"
                    value={newPlant.scientific_name}
                    onChange={(e) => setNewPlant(p => ({ ...p, scientific_name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{language === 'es' ? 'Categoría' : 'Category'}</Label>
                  <Select 
                    value={newPlant.category} 
                    onValueChange={(v) => setNewPlant(p => ({ ...p, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, labels]) => (
                        <SelectItem key={value} value={value}>
                          {language === 'es' ? labels.es : labels.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{language === 'es' ? 'Estado Nativo' : 'Native Status'}</Label>
                  <Select 
                    value={newPlant.native_status} 
                    onValueChange={(v) => setNewPlant(p => ({ ...p, native_status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="native">{language === 'es' ? 'Nativa' : 'Native'}</SelectItem>
                      <SelectItem value="naturalized">{language === 'es' ? 'Naturalizada' : 'Naturalized'}</SelectItem>
                      <SelectItem value="exotic">{language === 'es' ? 'Exótica' : 'Exotic'}</SelectItem>
                      <SelectItem value="invasive">{language === 'es' ? 'Invasiva' : 'Invasive'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mountain className="h-4 w-4" />
                    {language === 'es' ? 'Zona de Elevación' : 'Elevation Zone'}
                  </Label>
                  <Select 
                    value={newPlant.elevation_zone} 
                    onValueChange={(v) => setNewPlant(p => ({ ...p, elevation_zone: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coastal">
                        <div className="flex items-center gap-2">
                          <Waves className="h-4 w-4 text-blue-500" />
                          <div>
                            <span>{language === 'es' ? 'Costera (0-300m)' : 'Coastal (0-300m)'}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {language === 'es' ? 'Guanacaste, Pacífico' : 'Guanacaste, Pacific'}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="transitional">
                        <div className="flex items-center gap-2">
                          <TreeDeciduous className="h-4 w-4 text-green-500" />
                          <div>
                            <span>{language === 'es' ? 'Transicional (300-1500m)' : 'Transitional (300-1500m)'}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {language === 'es' ? 'Valle Central' : 'Central Valley'}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="highland">
                        <div className="flex items-center gap-2">
                          <Mountain className="h-4 w-4 text-purple-500" />
                          <div>
                            <span>{language === 'es' ? 'Montaña (1500m+)' : 'Highland (1500m+)'}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {language === 'es' ? 'Monteverde, Talamanca' : 'Monteverde, Talamanca'}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {language === 'es' 
                      ? 'La zona de elevación determina los cuidados específicos para el clima' 
                      : 'Elevation zone determines climate-specific care protocols'}
                  </p>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-6">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">
                        {language === 'es' ? 'Generación con IA' : 'AI-Powered Generation'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'es' 
                          ? 'Al registrar, la IA generará un protocolo completo de cuidados específico para el clima de tu finca.'
                          : 'Upon registration, AI will generate a complete care protocol specific to your estate\'s climate.'}
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full gap-2" 
                  onClick={generateCareProtocol}
                  disabled={generating || !newPlant.common_name.trim()}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {language === 'es' ? 'Generando protocolo...' : 'Generating protocol...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {language === 'es' ? 'Registrar y Generar Cuidados' : 'Register & Generate Care'}
                    </>
                  )}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === 'es' ? 'Buscar variedades...' : 'Search varieties...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Plant List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredProfiles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Leaf className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery 
                  ? (language === 'es' ? 'No se encontraron variedades' : 'No varieties found')
                  : (language === 'es' ? 'Registra tu primera variedad' : 'Register your first variety')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredProfiles.map((profile) => (
              <Card 
                key={profile.id} 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedProfile(profile)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Leaf className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{profile.common_name}</h3>
                      {profile.scientific_name && (
                        <p className="text-sm text-muted-foreground italic">{profile.scientific_name}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {profile.category && (
                          <Badge variant="secondary" className="text-xs">
                            {categoryLabels[profile.category]?.[language === 'es' ? 'es' : 'en'] || profile.category}
                          </Badge>
                        )}
                        {profile.care_template_json && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Sparkles className="h-3 w-3" />
                            {language === 'es' ? 'IA' : 'AI'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Care Protocol Detail Sheet - Using enhanced component */}
        {selectedProfile && (
          <CareProtocolSheet
            open={showCareSheet || !!selectedProfile}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedProfile(null);
                setShowCareSheet(false);
              }
            }}
            plantName={selectedProfile.common_name}
            scientificName={selectedProfile.scientific_name || undefined}
            careProtocol={selectedProfile.care_template_json}
          />
        )}
      </div>
    </ModernAppLayout>
  );
}

