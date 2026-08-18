import React, { useEffect, useState } from 'react';
import { Loader2, Save, Settings as SettingsIcon } from 'lucide-react';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrgType } from '@/hooks/usePlantOps';
import {
  fetchCareSettings,
  saveCareSettings,
  fetchModules,
  saveModules,
  POT_MATERIALS,
  POT_MATERIAL_LABELS,
  type PotMaterial,
  type CareSettings,
} from '@/lib/plantopsCare';

const MODULE_KEYS = ['visits', 'care', 'billing', 'contracts', 'inventory', 'portal'] as const;
const VENTILATION = ['baja', 'media', 'alta', 'aire_acondicionado'];
const LIGHT = ['sombra', 'luz_indirecta', 'luz_directa', 'artificial'];
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

/**
 * PlantOps configuration. Every agronomic adjustment factor lives here — nothing
 * is hardcoded in the care engine.
 */
export default function PlantOpsSettings() {
  const { language } = useLanguage();
  const { orgId } = useOrgType();
  const { toast } = useToast();
  const l = (en: string, es: string) => (language === 'es' ? es : en);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState<CareSettings>({});

  useEffect(() => {
    document.title = l('PlantOps settings', 'Configuración PlantOps');
  }, [language]);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const [m, s] = await Promise.all([fetchModules(orgId), fetchCareSettings(orgId)]);
        setModules(m);
        setSettings(s);
      } catch (e: any) {
        toast({ title: l('Could not load settings', 'No se pudo cargar la configuración'), description: e.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId]);

  const setFactor = (group: keyof CareSettings, key: string, value: string) => {
    setSettings((prev) => {
      const next = { ...prev, [group]: { ...(prev[group] as Record<string, number> | undefined) } } as CareSettings;
      const bucket = next[group] as Record<string, number>;
      if (value === '') delete bucket[key];
      else bucket[key] = Number(value);
      return next;
    });
  };

  const factorValue = (group: keyof CareSettings, key: string) => {
    const bucket = settings[group] as Record<string, number> | undefined;
    const v = bucket?.[key];
    return v == null ? '' : String(v);
  };

  const save = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      await Promise.all([saveModules(orgId, modules), saveCareSettings(orgId, settings)]);
      toast({ title: l('Settings saved', 'Configuración guardada') });
    } catch (e: any) {
      toast({ title: l('Could not save', 'No se pudo guardar'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const factorGroup = (
    group: keyof CareSettings,
    title: string,
    keys: string[],
    labeler?: (k: string) => string,
  ) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {keys.map((k) => (
          <div key={k} className="space-y-1">
            <Label className="text-xs capitalize">{labeler ? labeler(k) : k.replace(/_/g, ' ')}</Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={factorValue(group, k)}
              onChange={(e) => setFactor(group, k, e.target.value)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <ModernAppLayout>
      <main className="p-4 space-y-4 max-w-3xl mx-auto safe-area-content pb-28">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            {l('PlantOps settings', 'Configuración PlantOps')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {l('Active modules and the day adjustments applied to every care plan.',
               'Módulos activos y los ajustes en días que se aplican a cada plan de cuidado.')}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{l('Modules', 'Módulos')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {MODULE_KEYS.map((k) => (
                  <div key={k} className="flex items-center justify-between">
                    <Label className="capitalize text-sm">{k}</Label>
                    <Switch
                      checked={modules[k] !== false}
                      onCheckedChange={(v) => setModules((prev) => ({ ...prev, [k]: v }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              {l('Positive values stretch the interval, negative values shorten it (days).',
                 'Valores positivos alargan el intervalo, negativos lo acortan (días).')}
            </p>

            {factorGroup('pot_material', l('Pot material', 'Material de maceta'), [...POT_MATERIALS], (k) =>
              language === 'es' ? POT_MATERIAL_LABELS[k as PotMaterial].es : POT_MATERIAL_LABELS[k as PotMaterial].en,
            )}
            {factorGroup('ventilation', l('Ventilation', 'Ventilación'), VENTILATION)}
            {factorGroup('light_actual', l('Actual light', 'Luz real'), LIGHT)}
            {factorGroup('season', l('Month', 'Mes'), MONTHS, (k) =>
              new Date(2024, Number(k) - 1, 1).toLocaleDateString(language === 'es' ? 'es-CR' : 'en-US', { month: 'short' }),
            )}

            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {l('Save settings', 'Guardar configuración')}
            </Button>
          </>
        )}
      </main>
    </ModernAppLayout>
  );
}
