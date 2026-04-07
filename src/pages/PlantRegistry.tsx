import React, { useState, useEffect } from 'react';
import { Leaf, Plus, Search, Loader2, Mountain, Waves, TreeDeciduous, FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CareProtocolSheet } from '@/components/plants/CareProtocolSheet';
import { setCareProtocolForLanguage, type CareProtocolLanguage } from '@/lib/careProtocol';

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
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const [profiles, setProfiles] = useState<PlantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<PlantProfile | null>(null);
  const [showCareSheet, setShowCareSheet] = useState(false);

  const [newPlant, setNewPlant] = useState({ common_name: '', scientific_name: '', category: 'ornamental', native_status: 'exotic', elevation_zone: 'transitional' });
  const currentLanguage = (language === 'de' ? 'de' : language === 'es' ? 'es' : 'en') as CareProtocolLanguage;

  useEffect(() => { fetchProfiles(); }, []);

  async function fetchProfiles() {
    try {
      const { data, error } = await supabase.from('plant_profiles').select('*').order('common_name');
      if (error) throw error;
      setProfiles(data || []);
    } finally {
      setLoading(false);
    }
  }

  async function generateCareProtocol() {
    if (!newPlant.common_name.trim()) {
      toast.error(language === 'es' ? 'Ingrese el nombre de la planta' : language === 'de' ? 'Pflanzenname eingeben' : 'Enter plant name');
      return;
    }

    setGenerating(true);
    try {
      let climate = 'Tropical/Subtropical Costa Rica';
      if (currentEstate?.country === 'CR') climate = 'Costa Rica - Tropical';
      else if (currentEstate?.country === 'PR') climate = 'Tropical Caribbean';

      const { data, error } = await supabase.functions.invoke('plant-care-ai', {
        body: {
          plantName: newPlant.common_name,
          scientificName: newPlant.scientific_name,
          category: newPlant.category,
          climate,
          language: currentLanguage,
          elevationZone: newPlant.elevation_zone,
          propertyType: 'luxury residential',
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const localizedProtocol = setCareProtocolForLanguage(null, currentLanguage, data.careProtocol);
      const { data: profile, error: insertError } = await supabase.from('plant_profiles').insert([{ common_name: newPlant.common_name, scientific_name: newPlant.scientific_name || null, category: newPlant.category as any, native_status: newPlant.native_status as any, care_template_json: localizedProtocol as any }]).select().single();
      if (insertError) throw insertError;

      toast.success(language === 'es' ? `Protocolo generado para ${newPlant.common_name}` : language === 'de' ? `Protokoll erstellt für ${newPlant.common_name}` : `Care protocol generated for ${newPlant.common_name}`);
      setProfiles((prev) => [...prev, profile]);
      setShowAddSheet(false);
      setNewPlant({ common_name: '', scientific_name: '', category: 'ornamental', native_status: 'exotic', elevation_zone: 'transitional' });
      setSelectedProfile(profile);
      setShowCareSheet(true);
    } catch (error: any) {
      toast.error(error.message || (language === 'es' ? 'Error al generar protocolo' : language === 'de' ? 'Protokoll konnte nicht erstellt werden' : 'Failed to generate protocol'));
    } finally {
      setGenerating(false);
    }
  }

  const filteredProfiles = profiles.filter((p) => p.common_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.scientific_name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const categoryLabels: Record<string, { en: string; es: string; de: string }> = {
    ornamental: { en: 'Ornamental', es: 'Ornamental', de: 'Zierpflanze' },
    edible: { en: 'Edible', es: 'Comestible', de: 'Essbar' },
    structural: { en: 'Structural', es: 'Estructural', de: 'Strukturell' },
    ecological: { en: 'Ecological', es: 'Ecológico', de: 'Ökologisch' },
    other: { en: 'Other', es: 'Otro', de: 'Andere' },
  };

  return (
    <ModernAppLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold">{language === 'es' ? 'Registro de Variedades' : language === 'de' ? 'Pflanzenregister' : 'Plant Registry'}</h1>
            <p className="text-muted-foreground text-sm">{language === 'es' ? 'Registra nuevas variedades y genera protocolos de cuidado' : language === 'de' ? 'Neue Sorten registrieren und Pflegeprotokolle erstellen' : 'Register new varieties and generate care protocols'}</p>
          </div>
          <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
            <SheetTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />{language === 'es' ? 'Nueva Variedad' : language === 'de' ? 'Neue Sorte' : 'New Variety'}</Button></SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-auto">
              <SheetHeader><SheetTitle className="flex items-center gap-2"><Leaf className="h-5 w-5 text-primary" />{language === 'es' ? 'Registrar Nueva Variedad' : language === 'de' ? 'Neue Sorte registrieren' : 'Register New Variety'}</SheetTitle></SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-2"><Label>{language === 'es' ? 'Nombre Común *' : language === 'de' ? 'Trivialname *' : 'Common Name *'}</Label><Input placeholder={language === 'es' ? 'Ej: Heliconia Rostrata' : 'E.g., Bird of Paradise'} value={newPlant.common_name} onChange={(e) => setNewPlant((p) => ({ ...p, common_name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{language === 'es' ? 'Nombre Científico' : language === 'de' ? 'Wissenschaftlicher Name' : 'Scientific Name'}</Label><Input placeholder="Strelitzia reginae" value={newPlant.scientific_name} onChange={(e) => setNewPlant((p) => ({ ...p, scientific_name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{language === 'es' ? 'Categoría' : language === 'de' ? 'Kategorie' : 'Category'}</Label><Select value={newPlant.category} onValueChange={(v) => setNewPlant((p) => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(categoryLabels).map(([value, labels]) => <SelectItem key={value} value={value}>{language === 'es' ? labels.es : language === 'de' ? labels.de : labels.en}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>{language === 'es' ? 'Estado Nativo' : language === 'de' ? 'Heimischkeitsstatus' : 'Native Status'}</Label><Select value={newPlant.native_status} onValueChange={(v) => setNewPlant((p) => ({ ...p, native_status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="native">{language === 'es' ? 'Nativa' : language === 'de' ? 'Einheimisch' : 'Native'}</SelectItem><SelectItem value="naturalized">{language === 'es' ? 'Naturalizada' : language === 'de' ? 'Eingebürgert' : 'Naturalized'}</SelectItem><SelectItem value="exotic">{language === 'es' ? 'Exótica' : language === 'de' ? 'Exotisch' : 'Exotic'}</SelectItem><SelectItem value="invasive">{language === 'es' ? 'Invasiva' : language === 'de' ? 'Invasiv' : 'Invasive'}</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label className="flex items-center gap-2"><Mountain className="h-4 w-4" />{language === 'es' ? 'Zona de Elevación' : language === 'de' ? 'Höhenzone' : 'Elevation Zone'}</Label><Select value={newPlant.elevation_zone} onValueChange={(v) => setNewPlant((p) => ({ ...p, elevation_zone: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="coastal"><div className="flex items-center gap-2"><Waves className="h-4 w-4 text-blue-500" /><div><span>{language === 'es' ? 'Costera (0-300m)' : language === 'de' ? 'Küste (0-300m)' : 'Coastal (0-300m)'}</span></div></div></SelectItem><SelectItem value="transitional"><div className="flex items-center gap-2"><TreeDeciduous className="h-4 w-4 text-green-500" /><div><span>{language === 'es' ? 'Transicional (300-1500m)' : language === 'de' ? 'Übergang (300-1500m)' : 'Transitional (300-1500m)'}</span></div></div></SelectItem><SelectItem value="highland"><div className="flex items-center gap-2"><Mountain className="h-4 w-4 text-primary" /><div><span>{language === 'es' ? 'Montaña (1500m+)' : language === 'de' ? 'Hochland (1500m+)' : 'Highland (1500m+)'}</span></div></div></SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">{language === 'es' ? 'La zona de elevación determina los cuidados específicos para el clima' : language === 'de' ? 'Die Höhenzone bestimmt die klimabezogenen Pflegehinweise' : 'Elevation zone determines climate-specific care protocols'}</p></div>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-6"><div className="flex items-start gap-3"><FileText className="h-5 w-5 text-primary mt-0.5" /><div><p className="font-medium text-sm">{language === 'es' ? 'Generación de protocolo' : language === 'de' ? 'Protokollerstellung' : 'Protocol generation'}</p><p className="text-xs text-muted-foreground mt-1">{language === 'es' ? 'Al registrar, se generará un protocolo completo de cuidados específico para el clima de tu finca.' : language === 'de' ? 'Bei der Registrierung wird ein vollständiges Pflegeprotokoll passend zum Klima deines Anwesens erstellt.' : 'Upon registration, a complete care protocol specific to your estate climate will be generated.'}</p></div></div></div>
                <Button className="w-full gap-2" onClick={generateCareProtocol} disabled={generating || !newPlant.common_name.trim()}>{generating ? <><Loader2 className="h-4 w-4 animate-spin" />{language === 'es' ? 'Generando protocolo...' : language === 'de' ? 'Protokoll wird erstellt...' : 'Generating protocol...'}</> : <><Plus className="h-4 w-4" />{language === 'es' ? 'Registrar y Generar Protocolo' : language === 'de' ? 'Registrieren & Protokoll erstellen' : 'Register & Generate Protocol'}</>}</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={language === 'es' ? 'Buscar variedades...' : language === 'de' ? 'Sorten suchen...' : 'Search varieties...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>

        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : filteredProfiles.length === 0 ? <Card className="border-dashed"><CardContent className="py-12 text-center"><Leaf className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">{searchQuery ? (language === 'es' ? 'No se encontraron variedades' : language === 'de' ? 'Keine Sorten gefunden' : 'No varieties found') : (language === 'es' ? 'Registra tu primera variedad' : language === 'de' ? 'Registriere deine erste Sorte' : 'Register your first variety')}</p></CardContent></Card> : <div className="grid gap-3">{filteredProfiles.map((profile) => <Card key={profile.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedProfile(profile)}><CardContent className="p-4"><div className="flex items-start gap-4"><div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Leaf className="h-6 w-6 text-primary" /></div><div className="flex-1 min-w-0"><h3 className="font-semibold truncate">{profile.common_name}</h3>{profile.scientific_name && <p className="text-sm text-muted-foreground italic">{profile.scientific_name}</p>}<div className="flex items-center gap-2 mt-2">{profile.category && <Badge variant="secondary" className="text-xs">{categoryLabels[profile.category]?.[language === 'es' ? 'es' : language === 'de' ? 'de' : 'en'] || profile.category}</Badge>}{profile.care_template_json && <Badge variant="outline" className="text-xs gap-1"><Sparkles className="h-3 w-3" />{currentLanguage.toUpperCase()}</Badge>}</div></div></div></CardContent></Card>)}</div>}

        {selectedProfile && <CareProtocolSheet open={showCareSheet || !!selectedProfile} onOpenChange={(open) => { if (!open) { setSelectedProfile(null); setShowCareSheet(false); } }} plantName={selectedProfile.common_name} scientificName={selectedProfile.scientific_name || undefined} careProtocol={selectedProfile.care_template_json} />}
      </div>
    </ModernAppLayout>
  );
}
