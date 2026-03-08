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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AssetType = 'plant' | 'tree' | 'irrigation_controller' | 'valve' | 'lighting_transformer' | 'hardscape' | 'equipment' | 'structure';

interface WizardStep {
  type: AssetType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  labelEs: string;
  description: string;
  descriptionEs: string;
}

const WIZARD_STEPS: WizardStep[] = [
  { type: 'tree', icon: TreePine, label: 'Trees', labelEs: 'Árboles', description: 'Add trees on your property', descriptionEs: 'Agrega los árboles de tu propiedad' },
  { type: 'plant', icon: Sprout, label: 'Plants & Beds', labelEs: 'Plantas y Jardineras', description: 'Add plant beds, shrubs, flowers', descriptionEs: 'Agrega jardineras, arbustos, flores' },
  { type: 'irrigation_controller', icon: Droplets, label: 'Irrigation', labelEs: 'Riego', description: 'Add irrigation controllers', descriptionEs: 'Agrega controladores de riego' },
  { type: 'valve', icon: Cog, label: 'Valves', labelEs: 'Válvulas', description: 'Add irrigation valves', descriptionEs: 'Agrega válvulas de riego' },
  { type: 'lighting_transformer', icon: Lightbulb, label: 'Lighting', labelEs: 'Iluminación', description: 'Add lighting transformers', descriptionEs: 'Agrega transformadores de iluminación' },
  { type: 'hardscape', icon: Fence, label: 'Hardscape', labelEs: 'Hardscape', description: 'Add patios, walls, pathways', descriptionEs: 'Agrega patios, muros, caminos' },
  { type: 'structure', icon: Building, label: 'Structures', labelEs: 'Estructuras', description: 'Add buildings, sheds, pergolas', descriptionEs: 'Agrega edificios, cobertizos, pérgolas' },
  { type: 'equipment', icon: Hammer, label: 'Equipment', labelEs: 'Equipos', description: 'Add tools and equipment', descriptionEs: 'Agrega herramientas y equipos' },
];

interface AssetEntry {
  name: string;
  description: string;
  zone_id: string;
  critical_care_note: string;
}

const emptyEntry = (): AssetEntry => ({ name: '', description: '', zone_id: '', critical_care_note: '' });

export function AssetWizard() {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const navigate = useNavigate();
  const es = language === 'es';

  const [currentStep, setCurrentStep] = useState(0);
  const [entries, setEntries] = useState<AssetEntry[]>([emptyEntry()]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedCounts, setSavedCounts] = useState<Record<string, number>>({});

  const totalSteps = WIZARD_STEPS.length;
  const step = WIZARD_STEPS[currentStep];
  const progress = ((currentStep) / totalSteps) * 100;

  useEffect(() => {
    if (currentEstate) fetchZones();
  }, [currentEstate]);

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
      toast.success(es 
        ? `✅ ${validEntries.length} ${step.labelEs.toLowerCase()} guardados` 
        : `✅ ${validEntries.length} ${step.label.toLowerCase()} saved`
      );
      goNext();
    } catch (error) {
      console.error('Error saving assets:', error);
      toast.error(es ? 'Error al guardar' : 'Failed to save');
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
      toast.success(es ? `🎉 ${total} activos creados en total` : `🎉 ${total} total assets created`);
    }
    navigate('/map');
  }

  const StepIcon = step.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-semibold text-foreground">
            {es ? 'Asistente de Configuración' : 'Setup Wizard'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {es ? 'Agrega tus activos paso a paso. Puedes saltar cualquier sección.' : 'Add your assets step by step. You can skip any section.'}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>{es ? 'Paso' : 'Step'} {currentStep + 1} / {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step indicators */}
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
                {es ? s.labelEs : s.label}
                {count > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{count}</Badge>}
              </button>
            );
          })}
        </div>

        {/* Current step card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <StepIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-serif font-semibold text-foreground">
                  {es ? step.labelEs : step.label}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {es ? step.descriptionEs : step.description}
                </p>
              </div>
            </div>

            {/* Asset entries */}
            <div className="space-y-4">
              {entries.map((entry, index) => (
                <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {es ? step.labelEs : step.label} #{index + 1}
                    </span>
                    {entries.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeEntry(index)} className="text-destructive h-7 px-2">
                        ✕
                      </Button>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs">{es ? 'Nombre *' : 'Name *'}</Label>
                    <Input
                      placeholder={es ? `Ej: ${step.labelEs} principal` : `E.g.: Main ${step.label.toLowerCase()}`}
                      value={entry.name}
                      onChange={e => updateEntry(index, 'name', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">{es ? 'Descripción' : 'Description'}</Label>
                    <Input
                      placeholder={es ? 'Opcional' : 'Optional'}
                      value={entry.description}
                      onChange={e => updateEntry(index, 'description', e.target.value)}
                    />
                  </div>

                  {zones.length > 0 && (
                    <div>
                      <Label className="text-xs">{es ? 'Zona' : 'Zone'}</Label>
                      <Select value={entry.zone_id} onValueChange={v => updateEntry(index, 'zone_id', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder={es ? 'Seleccionar zona' : 'Select zone'} />
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
                    <Label className="text-xs">{es ? 'Nota de cuidado' : 'Care note'}</Label>
                    <Textarea
                      placeholder={es ? 'Instrucciones especiales de cuidado...' : 'Special care instructions...'}
                      value={entry.critical_care_note}
                      onChange={e => updateEntry(index, 'critical_care_note', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addEntry} className="w-full border-dashed">
                <Plus className="h-4 w-4 mr-2" />
                {es ? `Agregar otro ${step.labelEs.toLowerCase()}` : `Add another ${step.label.toLowerCase()}`}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={goBack} disabled={currentStep === 0}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {es ? 'Anterior' : 'Back'}
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={goNext}>
              <SkipForward className="h-4 w-4 mr-1" />
              {es ? 'Saltar' : 'Skip'}
            </Button>

            {currentStep === totalSteps - 1 ? (
              <Button onClick={saveCurrentStep} disabled={saving}>
                <Check className="h-4 w-4 mr-1" />
                {saving ? (es ? 'Guardando...' : 'Saving...') : (es ? 'Finalizar' : 'Finish')}
              </Button>
            ) : (
              <Button onClick={saveCurrentStep} disabled={saving}>
                {saving ? (es ? 'Guardando...' : 'Saving...') : (es ? 'Guardar y continuar' : 'Save & Continue')}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Skip all */}
        <div className="text-center mt-6">
          <Button variant="link" onClick={finishWizard} className="text-muted-foreground">
            {es ? 'Saltar todo y ir al mapa →' : 'Skip all and go to map →'}
          </Button>
        </div>
      </div>
    </div>
  );
}
