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
  MODULE_KEYS,
  MODULES,
  PRESETS,
  moduleDescription,
  moduleLabel,
  resolveModules,
  type ModuleKey,
  type PresetKey,
} from '@/lib/homeGuideModules';

/**
 * PlantOps configuration: which modules the organization operates.
 * No global agronomic coefficients live here — care always comes from the
 * species baseline, the placement baseline or a documented exception.
 */
export default function PlantOpsSettings() {
  const { language } = useLanguage();
  const { orgId } = useOrgType();
  const { toast } = useToast();
  const { modules: savedModules, saveModules, loading: modulesLoading } = useModules();
  const l = (en: string, es: string) => (language === 'es' ? es : en);

  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState<Record<ModuleKey, boolean> | null>(null);
  const loading = modulesLoading && !modules;

  useEffect(() => {
    document.title = l('PlantOps settings', 'Configuración PlantOps');
  }, [language]);

  useEffect(() => {
    if (!modulesLoading) setModules((prev) => prev ?? savedModules);
  }, [modulesLoading, savedModules]);

  const effective = useMemo(() => resolveModules(modules ?? {}), [modules]);
  const enabledCount = MODULE_KEYS.filter((k) => effective[k]).length;

  /** Dirty = the edited selection differs from what the database holds. */
  const dirty = useMemo(
    () => MODULE_KEYS.some((k) => !!effective[k] !== !!savedModules[k]),
    [effective, savedModules],
  );
  const [justSaved, setJustSaved] = useState(false);

  /** Which preset the current selection matches (for highlighting). */
  const activePreset: PresetKey = useMemo(() => {
    for (const p of PRESETS) {
      if (!p.modules) continue;
      if (MODULE_KEYS.every((k) => !!p.modules![k] === !!effective[k])) return p.key;
    }
    return 'custom';
  }, [effective]);

  const toggleModule = (key: ModuleKey, value: boolean) => {
    setJustSaved(false);
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
    setJustSaved(false);
    setModules(resolveModules(p.modules));
  };

  const save = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      // Every canonical key is persisted explicitly (true/false) so archetype
      // defaults can never re-introduce a module that was switched off.
      await saveModules(effective);
      setJustSaved(true);
      const active = MODULE_KEYS.filter((k) => effective[k]).map((k) => moduleLabel(k, language));
      toast({
        title: l('Settings saved', 'Configuración guardada'),
        description: active.length
          ? `${active.length} ${l('modules enabled', 'módulos activos')}: ${active.join(', ')}`
          : l('No modules active — only configuration stays available.',
               'Sin módulos activos: solo queda disponible la configuración.'),
      });
    } catch (e: any) {
      setJustSaved(false);
      toast({ title: l('Could not save', 'No se pudo guardar'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };




  return (
    <ModernAppLayout>
      <main className="p-4 space-y-4 max-w-3xl mx-auto safe-area-content">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            {l('Operation settings', 'Configuración de la operación')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {l('Choose the functionality you use. Everything can be turned off.',
               'Elija la funcionalidad que usa. Todo se puede desactivar.')}
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


            {effective.care && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{l('Care criteria', 'Criterios de cuidado')}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    {l('Care intervals are never guessed from global coefficients. Each plant uses, in this order: a documented exception, the interval recorded for that placement, or the species baseline.',
                       'Los intervalos de cuidado no se estiman con coeficientes globales. Cada planta usa, en este orden: una excepción documentada, el intervalo registrado en esa ubicación, o la línea base de la especie.')}
                  </p>
                  <p>
                    {l('When none of those exist the plant is listed as “Needs review” instead of receiving an invented interval.',
                       'Si no existe ninguno, la planta queda como «Requiere revisión» en lugar de recibir un intervalo inventado.')}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="sticky bottom-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {enabledCount} {l('modules enabled', 'módulos activos')}
                </span>
                {saving ? (
                  <Badge variant="secondary">{l('Saving…', 'Guardando…')}</Badge>
                ) : dirty ? (
                  <Badge variant="destructive">{l('Unsaved changes', 'Cambios sin guardar')}</Badge>
                ) : justSaved ? (
                  <Badge variant="secondary">{l('Saved', 'Guardado')}</Badge>
                ) : null}
              </div>
              <Button onClick={save} disabled={saving || !dirty} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? l('Saving…', 'Guardando…') : l('Save settings', 'Guardar configuración')}
              </Button>
            </div>

          </>
        )}
      </main>
    </ModernAppLayout>
  );
}
