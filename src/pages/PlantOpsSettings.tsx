import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Settings as SettingsIcon } from 'lucide-react';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrgType } from '@/hooks/usePlantOps';
import { useModules } from '@/hooks/useModules';
import {
  fetchCareSettings,
  saveCareSettings,
  POT_MATERIALS,
  POT_MATERIAL_LABELS,
  type PotMaterial,
  type CareSettings,
} from '@/lib/plantopsCare';

import {
  MODULE_KEYS,
  MODULES,
  PRESETS,
  moduleDescription,
  moduleLabel,
  resolveModules,
  type ModuleKey,
  type PresetKey,
} from '@/lib/homeGuideModules';

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
  const { modules: savedModules, saveModules, loading: modulesLoading } = useModules();
  const l = (en: string, es: string) => (language === 'es' ? es : en);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState<Record<ModuleKey, boolean> | null>(null);
  const [settings, setSettings] = useState<CareSettings>({});

  useEffect(() => {
    document.title = l('PlantOps settings', 'Configuración PlantOps');
  }, [language]);

  useEffect(() => {
    if (!modulesLoading) setModules((prev) => prev ?? savedModules);
  }, [modulesLoading, savedModules]);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        setSettings(await fetchCareSettings(orgId));
      } catch (e: any) {
        toast({ title: l('Could not load settings', 'No se pudo cargar la configuración'), description: e.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId]);

  const effective = useMemo(() => resolveModules(modules ?? {}), [modules]);

  /** Which preset the current selection matches (for highlighting). */
  const activePreset: PresetKey = useMemo(() => {
    for (const p of PRESETS) {
      if (!p.modules) continue;
      if (MODULE_KEYS.every((k) => !!p.modules![k] === !!effective[k])) return p.key;
    }
    return 'custom';
  }, [effective]);

  const toggleModule = (key: ModuleKey, value: boolean) => {
    setModules((prev) => {
      const base = { ...(prev ?? savedModules) };
      base[key] = value;
      // Turning a module off also turns off whatever depends on it.
      return resolveModules(base);
    });
  };

  const applyPreset = (key: PresetKey) => {
    const p = PRESETS.find((x) => x.key === key);
    if (!p?.modules) return;
    setModules(resolveModules(p.modules));
  };

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
      await Promise.all([saveModules(effective), saveCareSettings(orgId, settings)]);
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
      <main className="p-4 space-y-4 max-w-3xl mx-auto safe-area-content">
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
                <CardTitle className="text-base">{l('Operation preset', 'Preajuste de operación')}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {PRESETS.filter((p) => p.modules).map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.key)}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      activePreset === p.key ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {language === 'es' ? p.label.es : language === 'de' ? p.label.de : p.label.en}
                      </span>
                      {activePreset === p.key && <Badge variant="secondary">{l('Active', 'Activo')}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {language === 'es' ? p.description.es : language === 'de' ? p.description.de : p.description.en}
                    </p>
                  </button>
                ))}
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  {activePreset === 'custom'
                    ? l('Custom selection — presets only prefill the switches below.',
                        'Selección personalizada: los preajustes solo precargan los interruptores.')
                    : l('A preset only prefills the switches below; you can still change any module.',
                        'Un preajuste solo precarga los interruptores; puede cambiar cualquier módulo.')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{l('Modules', 'Módulos')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {MODULE_KEYS.map((k) => {
                  const missing = MODULES[k].dependencies.filter((d) => !effective[d]);
                  return (
                    <div key={k} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Label className="text-sm">{moduleLabel(k, language)}</Label>
                        <p className="text-xs text-muted-foreground">{moduleDescription(k, language)}</p>
                        {missing.length > 0 && (
                          <p className="text-xs text-destructive mt-1">
                            {l('Requires: ', 'Requiere: ')}
                            {missing.map((d) => moduleLabel(d, language)).join(', ')}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={effective[k] === true}
                        disabled={missing.length > 0}
                        onCheckedChange={(v) => toggleModule(k, v)}
                      />
                    </div>
                  );
                })}
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
