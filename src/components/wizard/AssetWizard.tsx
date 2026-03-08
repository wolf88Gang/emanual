import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, ArrowLeft, Check, SkipForward, Plus, 
  TreePine, Droplets, Lightbulb, Hammer, Building, Fence,
  Sprout, Cog
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AssetType = 'plant' | 'tree' | 'irrigation_controller' | 'valve' | 'lighting_transformer' | 'hardscape' | 'equipment' | 'structure';

interface WizardStep {
  type: AssetType;
  icon: React.ComponentType<{ className?: string }>;
  label: { en: string; es: string; de: string };
  description: { en: string; es: string; de: string };
}

const WIZARD_STEPS: WizardStep[] = [
  { type: 'tree', icon: TreePine, label: { en: 'Trees', es: 'Árboles', de: 'Bäume' }, description: { en: 'Add trees on your property', es: 'Agrega los árboles de tu propiedad', de: 'Bäume auf Ihrem Grundstück hinzufügen' } },
  { type: 'plant', icon: Sprout, label: { en: 'Plants & Beds', es: 'Plantas y Jardineras', de: 'Pflanzen & Beete' }, description: { en: 'Add plant beds, shrubs, flowers', es: 'Agrega jardineras, arbustos, flores', de: 'Beete, Sträucher, Blumen hinzufügen' } },
  { type: 'irrigation_controller', icon: Droplets, label: { en: 'Irrigation', es: 'Riego', de: 'Bewässerung' }, description: { en: 'Add irrigation controllers', es: 'Agrega controladores de riego', de: 'Bewässerungssteuerungen hinzufügen' } },
  { type: 'valve', icon: Cog, label: { en: 'Valves', es: 'Válvulas', de: 'Ventile' }, description: { en: 'Add irrigation valves', es: 'Agrega válvulas de riego', de: 'Bewässerungsventile hinzufügen' } },
  { type: 'lighting_transformer', icon: Lightbulb, label: { en: 'Lighting', es: 'Iluminación', de: 'Beleuchtung' }, description: { en: 'Add lighting transformers', es: 'Agrega transformadores de iluminación', de: 'Beleuchtungstransformatoren hinzufügen' } },
  { type: 'hardscape', icon: Fence, label: { en: 'Hardscape', es: 'Hardscape', de: 'Hardscape' }, description: { en: 'Add patios, walls, pathways', es: 'Agrega patios, muros, caminos', de: 'Terrassen, Mauern, Wege hinzufügen' } },
  { type: 'structure', icon: Building, label: { en: 'Structures', es: 'Estructuras', de: 'Gebäude' }, description: { en: 'Add buildings, sheds, pergolas', es: 'Agrega edificios, cobertizos, pérgolas', de: 'Gebäude, Schuppen, Pergolen hinzufügen' } },
  { type: 'equipment', icon: Hammer, label: { en: 'Equipment', es: 'Equipos', de: 'Ausrüstung' }, description: { en: 'Add tools and equipment', es: 'Agrega herramientas y equipos', de: 'Werkzeuge und Ausrüstung hinzufügen' } },
];

interface AssetEntry {
  name: string;
  description: string;
  zone_id: string;
  critical_care_note: string;
}

const emptyEntry = (): AssetEntry => ({ name: '', description: '', zone_id: '', critical_care_note: '' });

export function AssetWizard() {
  const { tl } = useLanguage();
  const { currentEstate } = useEstate();
  const { assetLimit } = useSubscription();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [entries, setEntries] = useState<AssetEntry[]>([emptyEntry()]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedCounts, setSavedCounts] = useState<Record<string, number>>({});
  const [totalExistingAssets, setTotalExistingAssets] = useState(0);

  const totalSteps = WIZARD_STEPS.length;
  const step = WIZARD_STEPS[currentStep];
  const progress = ((currentStep) / totalSteps) * 100;
  const stepLabel = tl(step.label);

  useEffect(() => {
    if (currentEstate) {
      fetchZones();
      fetchAssetCount();
    }
  }, [currentEstate]);

  async function fetchAssetCount() {
    if (!currentEstate) return;
    const { count } = await supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('estate_id', currentEstate.id);
    setTotalExistingAssets(count || 0);
  }

  async function fetchZones() {
    const { data } = await supabase
      .from('zones')
      .select('id, name')
      .eq('estate_id', currentEstate!.id)
      .order('name');
    setZones(data || []);
  }

  function updateEntry(index: number, field: keyof AssetEntry, value: string) {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  }

  function addEntry() {
    setEntries(prev => [...prev, emptyEntry()]);
  }

  function removeEntry(index: number) {
    if (entries.length === 1) return;
    setEntries(prev => prev.filter((_, i) => i !== index));
  }

  async function saveCurrentStep() {
    if (!currentEstate) return;
    const validEntries = entries.filter(e => e.name.trim());
    if (validEntries.length === 0) {
      goNext();
      return;
    }

    const totalSavedInWizard = Object.values(savedCounts).reduce((a, b) => a + b, 0);
    const wouldHave = totalExistingAssets + totalSavedInWizard + validEntries.length;
    if (assetLimit && wouldHave > assetLimit) {
      const remaining = Math.max(0, assetLimit - totalExistingAssets - totalSavedInWizard);
      toast.error(tl({
        en: `Trial limit: you can only add ${remaining} more asset(s). Subscribe for unlimited.`,
        es: `Límite de prueba: solo puedes agregar ${remaining} activo(s) más. Suscríbete para ilimitados.`,
        de: `Testlimit: Sie können nur noch ${remaining} Anlage(n) hinzufügen. Abonnieren Sie für unbegrenzt.`,
      }));
      return;
    }

    setSaving(true);
    try {
      const inserts = validEntries.map(e => ({
        estate_id: currentEstate.id,
        name: e.name.trim(),
        description: e.description.trim() || null,
        asset_type: step.type as any,
        zone_id: e.zone_id || null,
        critical_care_note: e.critical_care_note.trim() || null,
      }));

      const { error } = await supabase.from('assets').insert(inserts);
      if (error) throw error;

      setSavedCounts(prev => ({ ...prev, [step.type]: (prev[step.type] || 0) + validEntries.length }));
      toast.success(`✅ ${validEntries.length} ${stepLabel.toLowerCase()} ${tl({ en: 'saved', es: 'guardados', de: 'gespeichert' })}`);
      goNext();
    } catch (error) {
      console.error('Error saving assets:', error);
      toast.error(tl({ en: 'Failed to save', es: 'Error al guardar', de: 'Fehler beim Speichern' }));
    } finally {
      setSaving(false);
    }
  }

  function goNext() {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
      setEntries([emptyEntry()]);
    } else {
      finishWizard();
    }
  }

  function goBack() {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setEntries([emptyEntry()]);
    }
  }

  function finishWizard() {
    const total = Object.values(savedCounts).reduce((a, b) => a + b, 0);
    if (total > 0) {
      toast.success(tl({
        en: `🎉 ${total} total assets created`,
        es: `🎉 ${total} activos creados en total`,
        de: `🎉 ${total} Anlagen insgesamt erstellt`,
      }));
    }
    navigate('/map');
  }

  const StepIcon = step.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-semibold text-foreground">
            {tl({ en: 'Setup Wizard', es: 'Asistente de Configuración', de: 'Einrichtungsassistent' })}
          </h1>
          <p className="text-muted-foreground mt-2">
            {tl({ en: 'Add your assets step by step. You can skip any section.', es: 'Agrega tus activos paso a paso. Puedes saltar cualquier sección.', de: 'Fügen Sie Ihre Anlagen Schritt für Schritt hinzu. Sie können jeden Abschnitt überspringen.' })}
          </p>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>{tl({ en: 'Step', es: 'Paso', de: 'Schritt' })} {currentStep + 1} / {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex gap-1 mb-8 overflow-x-auto pb-2">
          {WIZARD_STEPS.map((s, i) => {
            const Icon = s.icon;
            const count = savedCounts[s.type] || 0;
            return (
              <button
                key={s.type}
                onClick={() => { setCurrentStep(i); setEntries([emptyEntry()]); }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  i === currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : i < currentStep 
                      ? 'bg-secondary text-secondary-foreground' 
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tl(s.label)}
                {count > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{count}</Badge>}
              </button>
            );
          })}
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <StepIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-serif font-semibold text-foreground">{stepLabel}</h2>
                <p className="text-sm text-muted-foreground">{tl(step.description)}</p>
              </div>
            </div>

            <div className="space-y-4">
              {entries.map((entry, index) => (
                <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{stepLabel} #{index + 1}</span>
                    {entries.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeEntry(index)} className="text-destructive h-7 px-2">✕</Button>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">{tl({ en: 'Name *', es: 'Nombre *', de: 'Name *' })}</Label>
                    <Input
                      placeholder={tl({ en: `E.g.: Main ${stepLabel.toLowerCase()}`, es: `Ej: ${stepLabel} principal`, de: `Z.B.: Haupt-${stepLabel}` })}
                      value={entry.name}
                      onChange={e => updateEntry(index, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{tl({ en: 'Description', es: 'Descripción', de: 'Beschreibung' })}</Label>
                    <Input
                      placeholder={tl({ en: 'Optional', es: 'Opcional', de: 'Optional' })}
                      value={entry.description}
                      onChange={e => updateEntry(index, 'description', e.target.value)}
                    />
                  </div>
                  {zones.length > 0 && (
                    <div>
                      <Label className="text-xs">{tl({ en: 'Zone', es: 'Zona', de: 'Zone' })}</Label>
                      <Select value={entry.zone_id} onValueChange={v => updateEntry(index, 'zone_id', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder={tl({ en: 'Select zone', es: 'Seleccionar zona', de: 'Zone auswählen' })} />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.map(z => (
                            <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">{tl({ en: 'Care note', es: 'Nota de cuidado', de: 'Pflegehinweis' })}</Label>
                    <Textarea
                      placeholder={tl({ en: 'Special care instructions...', es: 'Instrucciones especiales de cuidado...', de: 'Besondere Pflegeanweisungen...' })}
                      value={entry.critical_care_note}
                      onChange={e => updateEntry(index, 'critical_care_note', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addEntry} className="w-full border-dashed">
                <Plus className="h-4 w-4 mr-2" />
                {tl({ en: `Add another ${stepLabel.toLowerCase()}`, es: `Agregar otro ${stepLabel.toLowerCase()}`, de: `Weitere ${stepLabel} hinzufügen` })}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={goBack} disabled={currentStep === 0}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {tl({ en: 'Back', es: 'Anterior', de: 'Zurück' })}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={goNext}>
              <SkipForward className="h-4 w-4 mr-1" />
              {tl({ en: 'Skip', es: 'Saltar', de: 'Überspringen' })}
            </Button>
            {currentStep === totalSteps - 1 ? (
              <Button onClick={saveCurrentStep} disabled={saving}>
                <Check className="h-4 w-4 mr-1" />
                {saving ? tl({ en: 'Saving...', es: 'Guardando...', de: 'Speichern...' }) : tl({ en: 'Finish', es: 'Finalizar', de: 'Fertig' })}
              </Button>
            ) : (
              <Button onClick={saveCurrentStep} disabled={saving}>
                {saving ? tl({ en: 'Saving...', es: 'Guardando...', de: 'Speichern...' }) : tl({ en: 'Save & Continue', es: 'Guardar y continuar', de: 'Speichern & Weiter' })}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        <div className="text-center mt-6">
          <Button variant="link" onClick={finishWizard} className="text-muted-foreground">
            {tl({ en: 'Skip all and go to map →', es: 'Saltar todo y ir al mapa →', de: 'Alles überspringen und zur Karte →' })}
          </Button>
        </div>
      </div>
    </div>
  );
}
