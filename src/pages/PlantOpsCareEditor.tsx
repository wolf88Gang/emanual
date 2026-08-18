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
import {
  fetchEffectiveCare, setCarePlan, formatDateEs,
  CARE_RESPONSIBILITIES, CARE_RESPONSIBILITY_LABELS,
  type EffectiveCare, type CareResponsibility,
} from '@/lib/plantopsCare';

/** care_responsibility is NOT NULL in the database: there is no "not defined" option. */
const DEFAULT_RESPONSIBILITY: CareResponsibility = 'raiz_y_forma';

export default function PlantOpsCareEditor() {
  const { placementId } = useParams<{ placementId: string }>();
  const navigate = useNavigate();
  const { tl } = useLanguage();
  const l = (en: string, es: string, de?: string) => tl({ en, es, de: de ?? en });

  const [care, setCare] = useState<EffectiveCare | null>(null);
  const [plantName, setPlantName] = useState<string>('');
  const [speciesGuide, setSpeciesGuide] = useState<Record<string, unknown> | null>(null);
  const [speciesName, setSpeciesName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    base_days: '',
    override_days: '',
    min_interval_days: '',
    water_amount_note: '',
    water_method: '',
    light_required: '',
    light_actual: '',
    ventilation: '',
    care_responsibility: DEFAULT_RESPONSIBILITY as string,
    reminder_contact: '',
    client_instructions: '',
    do_not_do: '',
    care_notes: '',
    override_reason: '',
  };
  const [form, setForm] = useState(emptyForm);

  const hydrate = (c: EffectiveCare) => {
    setForm({
      // Only the explicit placement base is editable here; a structured species
      // number may prefill it but is never silently persisted as the base.
      base_days: c.base_days != null ? String(c.base_days) : '',
      override_days: c.override_days != null ? String(c.override_days) : '',
      min_interval_days: c.min_interval_days != null ? String(c.min_interval_days) : '',
      water_amount_note: c.water_amount_note || '',
      water_method: c.water_method || '',
      light_required: c.light_required || '',
      light_actual: c.light_actual || '',
      ventilation: c.ventilation || '',
      care_responsibility: (CARE_RESPONSIBILITIES as readonly string[]).includes(c.care_responsibility || '')
        ? (c.care_responsibility as string)
        : DEFAULT_RESPONSIBILITY,
      reminder_contact: c.reminder_contact || '',
      client_instructions: c.client_instructions || '',
      do_not_do: c.do_not_do || '',
      care_notes: c.care_notes || '',
      override_reason: c.override_reason || '',
    });
  };

  const load = useCallback(async () => {
    if (!placementId) return;
    setLoading(true);
    try {
      const c = await fetchEffectiveCare(placementId);
      setCare(c);
      hydrate(c);

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
        if (prof?.plant_profile) {
          setSpeciesName(prof.plant_profile.scientific_name || prof.plant_profile.common_name || '');
          const tpl = prof.plant_profile.care_template_json;
          if (tpl && typeof tpl === 'object') setSpeciesGuide(tpl as Record<string, unknown>);
        }
      }
    } catch (e: any) {
      toast({ title: l('Error', 'Error'), description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [placementId]);

  useEffect(() => { load(); }, [load]);

  const num = (v: string) => (v.trim() === '' ? null : Number(v));

  const save = async () => {
    if (!placementId) return;
    if (form.override_days.trim() !== '' && !form.override_reason.trim()) {
      toast({
        title: l('Reason required', 'Motivo requerido'),
        description: l('A manual override needs a reason.', 'Un ajuste manual necesita un motivo.'),
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const updated = await setCarePlan({
        placementId,
        waterIntervalDays: num(form.base_days),
        overrideDays: num(form.override_days),
        minIntervalDays: num(form.min_interval_days),
        waterAmountNote: form.water_amount_note || null,
        waterMethod: form.water_method || null,
        lightRequired: form.light_required || null,
        lightActual: form.light_actual || null,
        ventilation: form.ventilation || null,
        careResponsibility: form.care_responsibility as CareResponsibility,
        reminderContact: form.reminder_contact || null,
        clientInstructions: form.client_instructions || null,
        doNotDo: form.do_not_do || null,
        careNotes: form.care_notes || null,
        overrideReason: form.override_reason || null,
      });
      setCare(updated);
      hydrate(updated);
      toast({ title: l('Care plan saved', 'Plan de cuidado guardado', 'Pflegeplan gespeichert') });
    } catch (e: any) {
      toast({ title: l('Error', 'Error'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const days = (n: number | null | undefined) => (n == null ? '—' : `${n} ${l('days', 'días', 'Tage')}`);

  return (
    <ModernAppLayout>
      <main className="p-4 space-y-4 safe-area-content max-w-3xl mx-auto pb-24">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={l('Back', 'Volver', 'Zurück')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{l('Care plan', 'Plan de cuidado', 'Pflegeplan')}</h1>
            <p className="text-sm text-muted-foreground">{plantName}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Species guidance = reference knowledge, never an operational value */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />{l('Species guidance (reference)', 'Guía de especie (referencia)', 'Artenleitfaden (Referenz)')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {speciesName && <p className="font-medium italic">{speciesName}</p>}
                  {care?.species_baseline_days != null ? (
                    <p>
                      {l('Structured suggestion', 'Sugerencia estructurada', 'Strukturierter Vorschlag')}:{' '}
                      <strong>{days(care.species_baseline_days)}</strong>
                      <Button variant="link" className="px-2 h-auto text-sm"
                        onClick={() => setForm({ ...form, base_days: String(care.species_baseline_days) })}>
                        {l('Use as base', 'Usar como base', 'Als Basis verwenden')}
                      </Button>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      {l('No structured numeric interval in the guide. Free text is never converted into a number.',
                        'La guía no tiene un intervalo numérico estructurado. El texto libre nunca se convierte en número.',
                        'Kein strukturiertes Intervall im Leitfaden.')}
                    </p>
                  )}
                  {speciesGuide ? (
                    <ul className="space-y-1 text-muted-foreground">
                      {Object.entries(speciesGuide).slice(0, 8).map(([k, v]) => (
                        <li key={k}><span className="font-medium">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">
                      {l('No species guide linked to this plant.', 'No hay guía de especie vinculada a esta planta.', 'Kein Artenleitfaden verknüpft.')}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4" />{l('Operational plan (in force)', 'Plan operativo (vigente)', 'Betriebsplan (gültig)')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  <p>{l('Operational base', 'Base operativa', 'Betriebsbasis')}: <strong>{days(care?.base_days)}</strong>{' '}
                    {care?.base_source === 'none' && (
                      <Badge variant="outline">{l('not defined — review', 'sin definir — revisar', 'nicht definiert — prüfen')}</Badge>
                    )}
                  </p>
                  <p>{l('Configured factors', 'Factores configurados', 'Konfigurierte Faktoren')}:{' '}
                    <strong>{(care?.factors_total_days ?? 0) > 0 ? `+${care?.factors_total_days}` : care?.factors_total_days ?? 0}</strong>
                  </p>
                  {(care?.configured_factors || []).length > 0 && (
                    <ul className="text-muted-foreground pl-3">
                      {(care?.configured_factors || []).map((f, i) => (
                        <li key={i}>{f.label ?? `${f.key ?? ''}: ${f.value ?? ''}`}: {f.days > 0 ? `+${f.days}` : f.days}</li>
                      ))}
                    </ul>
                  )}
                  <p>{l('Raíz y Forma override', 'Ajuste de Raíz y Forma', 'Manuelle Anpassung')}:{' '}
                    <strong>{care?.override_days != null ? days(care.override_days) : l('none', 'ninguno', 'keine')}</strong>
                  </p>
                  <p className="pt-1 border-t border-border/60">
                    {l('Effective plan', 'Plan efectivo', 'Effektiver Plan')}: <strong>{days(care?.effective_days)}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    {l('Last watered', 'Último riego', 'Letzte Gießung')}: {care?.last_watered_at ? formatDateEs(care.last_watered_at) : '—'}
                  </p>
                  <p className="text-muted-foreground">
                    {l('Next watering', 'Próximo riego', 'Nächste Gießung')}: {formatDateEs(care?.next_water_due)}
                  </p>
                  {care?.pot && (
                    <p className="text-muted-foreground">
                      {l('Pot', 'Maceta', 'Topf')}: {[care.pot.material, care.pot.volume_liters ? `${care.pot.volume_liters} L` : null,
                        care.pot.has_drainage === false ? l('no drainage', 'sin drenaje', 'keine Drainage') : null].filter(Boolean).join(' · ') || '—'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Editor */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{l('Edit plan', 'Editar plan', 'Plan bearbeiten')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label>{l('Base interval (days)', 'Intervalo base (días)', 'Basisintervall (Tage)')}</Label>
                    <Input type="number" min="1" max="365" value={form.base_days}
                      onChange={(e) => setForm({ ...form, base_days: e.target.value })}
                      placeholder={l('Recommended', 'Recomendado', 'Empfohlen')} />
                  </div>
                  <div>
                    <Label>{l('Manual override (days)', 'Ajuste manual (días)', 'Manuell (Tage)')}</Label>
                    <Input type="number" min="1" max="365" value={form.override_days}
                      onChange={(e) => setForm({ ...form, override_days: e.target.value })}
                      placeholder={l('Always wins', 'Siempre gana', 'Hat Vorrang')} />
                  </div>
                  <div>
                    <Label>{l('Minimum interval (days)', 'Intervalo mínimo (días)', 'Mindestintervall (Tage)')}</Label>
                    <Input type="number" min="1" max="365" value={form.min_interval_days}
                      onChange={(e) => setForm({ ...form, min_interval_days: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label>{l('Override reason', 'Motivo del ajuste', 'Grund der Anpassung')}</Label>
                  <Input value={form.override_reason}
                    onChange={(e) => setForm({ ...form, override_reason: e.target.value })} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>{l('Water amount', 'Cantidad de agua', 'Wassermenge')}</Label>
                    <Input value={form.water_amount_note} onChange={(e) => setForm({ ...form, water_amount_note: e.target.value })} />
                  </div>
                  <div>
                    <Label>{l('Watering method', 'Método de riego', 'Gießmethode')}</Label>
                    <Input value={form.water_method} onChange={(e) => setForm({ ...form, water_method: e.target.value })} />
                  </div>
                  <div>
                    <Label>{l('Light required', 'Luz requerida', 'Benötigtes Licht')}</Label>
                    <Input value={form.light_required} onChange={(e) => setForm({ ...form, light_required: e.target.value })} />
                  </div>
                  <div>
                    <Label>{l('Actual light', 'Luz actual', 'Aktuelles Licht')}</Label>
                    <Input value={form.light_actual} onChange={(e) => setForm({ ...form, light_actual: e.target.value })} />
                  </div>
                  <div>
                    <Label>{l('Ventilation', 'Ventilación', 'Belüftung')}</Label>
                    <Input value={form.ventilation} onChange={(e) => setForm({ ...form, ventilation: e.target.value })} />
                  </div>
                  <div>
                    <Label>{l('Care responsibility', 'Responsable del cuidado', 'Pflegeverantwortung')}</Label>
                    <Select value={form.care_responsibility}
                      onValueChange={(v) => setForm({ ...form, care_responsibility: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        
                        {CARE_RESPONSIBILITIES.map((r) => (
                          <SelectItem key={r} value={r}>{tl(CARE_RESPONSIBILITY_LABELS[r])}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>{l('Reminder contact', 'Contacto para recordatorios', 'Erinnerungskontakt')}</Label>
                    <Input value={form.reminder_contact} onChange={(e) => setForm({ ...form, reminder_contact: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label>{l('Client instructions', 'Instrucciones para el cliente', 'Kundenanweisungen')}</Label>
                  <Textarea rows={3} value={form.client_instructions}
                    onChange={(e) => setForm({ ...form, client_instructions: e.target.value })} />
                </div>
                <div>
                  <Label>{l('Do not do', 'No hacer', 'Nicht tun')}</Label>
                  <Textarea rows={2} value={form.do_not_do}
                    onChange={(e) => setForm({ ...form, do_not_do: e.target.value })} />
                </div>
                <div>
                  <Label>{l('Internal notes', 'Notas internas', 'Interne Notizen')}</Label>
                  <Textarea rows={2} value={form.care_notes}
                    onChange={(e) => setForm({ ...form, care_notes: e.target.value })} />
                </div>

                <p className="text-xs text-muted-foreground">
                  {l('Clearing a field saves it as empty.', 'Vaciar un campo lo guarda como vacío.', 'Ein geleertes Feld wird leer gespeichert.')}
                </p>

                <div className="flex justify-end">
                  <Button onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {l('Save', 'Guardar', 'Speichern')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </ModernAppLayout>
  );
}
