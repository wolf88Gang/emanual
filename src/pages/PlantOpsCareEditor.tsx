import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, BookOpen, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { fetchEffectiveCare, setCarePlan, type EffectiveCare } from '@/lib/plantopsCare';

export default function PlantOpsCareEditor() {
  const { placementId } = useParams<{ placementId: string }>();
  const navigate = useNavigate();
  const { tl } = useLanguage();
  const l = (en: string, es: string) => tl({ en, es, de: en });

  const [care, setCare] = useState<EffectiveCare | null>(null);
  const [plantName, setPlantName] = useState<string>('');
  const [speciesGuide, setSpeciesGuide] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    override_days: '',
    min_interval_days: '',
    water_amount_note: '',
    water_method: '',
    light_required: '',
    light_actual: '',
    ventilation: '',
    care_responsibility: '',
    reminder_contact: '',
    client_instructions: '',
    do_not_do: '',
    care_notes: '',
    override_reason: '',
  });

  const load = useCallback(async () => {
    if (!placementId) return;
    setLoading(true);
    try {
      const c = await fetchEffectiveCare(placementId);
      setCare(c);
      setForm({
        override_days: c.override_days != null ? String(c.override_days) : '',
        min_interval_days: c.min_interval_days != null ? String(c.min_interval_days) : '',
        water_amount_note: c.water_amount_note || '',
        water_method: c.water_method || '',
        light_required: c.light_required || '',
        light_actual: c.light_actual || '',
        ventilation: c.ventilation || '',
        care_responsibility: c.care_responsibility || '',
        reminder_contact: '',
        client_instructions: c.client_instructions || '',
        do_not_do: c.do_not_do || '',
        care_notes: c.care_notes || '',
        override_reason: c.override_reason || '',
      });

      const { data: pl } = await supabase
        .from('plant_placements')
        .select('asset_id, asset:assets!plant_placements_asset_id_fkey(name)')
        .eq('id', placementId)
        .single();
      const assetId = (pl as any)?.asset_id;
      setPlantName((pl as any)?.asset?.name ?? '');
      if (assetId) {
        const { data: inst } = await supabase
          .from('plant_instances')
          .select('plant_profile:plant_profiles(common_name, scientific_name, care_template_json)')
          .eq('asset_id', assetId)
          .limit(1);
        const prof = (inst || [])[0] as any;
        if (prof?.plant_profile?.care_template_json) setSpeciesGuide(prof.plant_profile.care_template_json);
      }
    } catch (e: any) {
      toast({ title: l('Error', 'Error'), description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [placementId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!placementId) return;
    setSaving(true);
    try {
      const updated = await setCarePlan({
        placementId,
        overrideDays: form.override_days ? Number(form.override_days) : null,
        minIntervalDays: form.min_interval_days ? Number(form.min_interval_days) : null,
        waterAmountNote: form.water_amount_note || null,
        waterMethod: form.water_method || null,
        lightRequired: form.light_required || null,
        lightActual: form.light_actual || null,
        ventilation: form.ventilation || null,
        careResponsibility: form.care_responsibility || null,
        reminderContact: form.reminder_contact || null,
        clientInstructions: form.client_instructions || null,
        doNotDo: form.do_not_do || null,
        careNotes: form.care_notes || null,
        overrideReason: form.override_reason || null,
      });
      setCare(updated);
      toast({ title: l('Care plan saved', 'Plan de cuidado guardado') });
    } catch (e: any) {
      toast({ title: l('Error', 'Error'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModernAppLayout>
      <main className="p-4 space-y-4 safe-area-content max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={l('Back', 'Volver')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{l('Care plan', 'Plan de cuidado')}</h1>
            <p className="text-sm text-muted-foreground">{plantName}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Comparison: species guide vs operational plan */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />{l('Species guide (reference)', 'Guía de especie (referencia)')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    {l('Baseline', 'Base')}:{' '}
                    <strong>{care?.baseline_days != null ? `${care.baseline_days} ${l('days', 'días')}` : l('not defined', 'no definida')}</strong>{' '}
                    <Badge variant="outline" className="ml-1">
                      {care?.baseline_source === 'species' ? l('from species', 'de especie') : l('none', 'ninguna')}
                    </Badge>
                  </p>
                  {speciesGuide ? (
                    <ul className="space-y-1 text-muted-foreground">
                      {Object.entries(speciesGuide).slice(0, 8).map(([k, v]) => (
                        <li key={k}><span className="font-medium">{k}:</span> {String(v)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">
                      {l('No species guide linked to this plant.', 'No hay guía de especie vinculada a esta planta.')}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4" />{l('Operational plan (in force)', 'Plan operativo (vigente)')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    {l('Effective interval', 'Intervalo efectivo')}:{' '}
                    <strong>{care?.effective_days != null ? `${care.effective_days} ${l('days', 'días')}` : '—'}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    {l('Next watering', 'Próximo riego')}: {care?.next_water_due || '—'}
                  </p>
                  {(care?.configured_factors || []).length > 0 && (
                    <div>
                      <p className="font-medium">{l('Configured adjustments', 'Ajustes configurados')}</p>
                      <ul className="text-muted-foreground">
                        {(care?.configured_factors || []).map((f, i) => (
                          <li key={i}>{f.label}: {f.days > 0 ? `+${f.days}` : f.days} {l('days', 'días')}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {care?.pot && (
                    <p className="text-muted-foreground">
                      {l('Pot', 'Maceta')}: {[care.pot.material, care.pot.volume_liters ? `${care.pot.volume_liters} L` : null,
                        care.pot.has_drainage === false ? l('no drainage', 'sin drenaje') : null].filter(Boolean).join(' · ') || '—'}
                    </p>
                  )}
                  {care?.override_days != null && (
                    <Badge variant="secondary">{l('Manual override active', 'Ajuste manual activo')}</Badge>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Editor */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{l('Edit plan', 'Editar plan')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>{l('Manual interval (days)', 'Intervalo manual (días)')}</Label>
                    <Input type="number" min="1" value={form.override_days}
                      onChange={(e) => setForm({ ...form, override_days: e.target.value })}
                      placeholder={l('Overrides the calculation', 'Reemplaza el cálculo')} />
                  </div>
                  <div>
                    <Label>{l('Minimum interval (days)', 'Intervalo mínimo (días)')}</Label>
                    <Input type="number" min="1" value={form.min_interval_days}
                      onChange={(e) => setForm({ ...form, min_interval_days: e.target.value })} />
                  </div>
                  <div>
                    <Label>{l('Water amount', 'Cantidad de agua')}</Label>
                    <Input value={form.water_amount_note}
                      onChange={(e) => setForm({ ...form, water_amount_note: e.target.value })}
                      placeholder={l('e.g. 1 liter', 'ej. 1 litro')} />
                  </div>
                  <div>
                    <Label>{l('Method', 'Método')}</Label>
                    <Input value={form.water_method} onChange={(e) => setForm({ ...form, water_method: e.target.value })} />
                  </div>
                  <div>
                    <Label>{l('Light required', 'Luz requerida')}</Label>
                    <Input value={form.light_required} onChange={(e) => setForm({ ...form, light_required: e.target.value })} />
                  </div>
                  <div>
                    <Label>{l('Light at the spot', 'Luz en el punto')}</Label>
                    <Input value={form.light_actual} onChange={(e) => setForm({ ...form, light_actual: e.target.value })} />
                  </div>
                  <div>
                    <Label>{l('Ventilation', 'Ventilación')}</Label>
                    <Input value={form.ventilation} onChange={(e) => setForm({ ...form, ventilation: e.target.value })} />
                  </div>
                  <div>
                    <Label>{l('Responsibility', 'Responsabilidad')}</Label>
                    <Select value={form.care_responsibility || undefined}
                      onValueChange={(v) => setForm({ ...form, care_responsibility: v })}>
                      <SelectTrigger><SelectValue placeholder={l('Select', 'Seleccionar')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">{l('Company', 'Empresa')}</SelectItem>
                        <SelectItem value="client">{l('Client', 'Cliente')}</SelectItem>
                        <SelectItem value="shared">{l('Shared', 'Compartida')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{l('Reminder contact', 'Contacto de recordatorio')}</Label>
                    <Input value={form.reminder_contact} onChange={(e) => setForm({ ...form, reminder_contact: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>{l('Client instructions', 'Instrucciones para el cliente')}</Label>
                  <Textarea rows={3} value={form.client_instructions}
                    onChange={(e) => setForm({ ...form, client_instructions: e.target.value })} />
                </div>
                <div>
                  <Label>{l('Do not do', 'No hacer')}</Label>
                  <Textarea rows={2} value={form.do_not_do} onChange={(e) => setForm({ ...form, do_not_do: e.target.value })} />
                </div>
                <div>
                  <Label>{l('Internal notes', 'Notas internas')}</Label>
                  <Textarea rows={2} value={form.care_notes} onChange={(e) => setForm({ ...form, care_notes: e.target.value })} />
                </div>
                <div>
                  <Label>{l('Reason for manual adjustment', 'Motivo del ajuste manual')}</Label>
                  <Input value={form.override_reason} onChange={(e) => setForm({ ...form, override_reason: e.target.value })} />
                </div>
                <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {l('Save plan', 'Guardar plan')}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </ModernAppLayout>
  );
}
