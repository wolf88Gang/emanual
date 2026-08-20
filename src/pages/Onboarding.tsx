import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Building2, Home, HardHat, RotateCcw, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { TRIAL_DAYS } from '@/contexts/SubscriptionContext';
import {
  BUSINESS_ARCHETYPES,
  suggestedModuleFlags,
  archetypeLabel,
  archetypeDescription,
  type BusinessArchetype,
} from '@/lib/businessArchetypes';
import {
  MODULE_LIST,
  PRESETS,
  moduleLabel,
  moduleDescription,
  resolveModules,
  type ModuleKey,
  type PresetKey,
} from '@/lib/homeGuideModules';

/**
 * Onboarding is scope-first.
 *
 *   Business  -> creates the ORGANIZATION (name + archetype + modules). No property.
 *   Individual-> creates the organization AND the first property.
 *   Worker    -> marketplace only.
 *
 * A business account is never a property: clients and projects come later.
 */
type Scope = 'business' | 'individual' | 'worker';
type Step = 'scope' | 'details' | 'modules';

const STEP_COUNT = 3;

export default function Onboarding() {
  const { user, profile, signOut, refreshUserData } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('scope');
  const [scope, setScope] = useState<Scope | ''>('');
  const [archetype, setArchetype] = useState<BusinessArchetype | ''>('');
  const [orgName, setOrgName] = useState('');
  const [country, setCountry] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [flags, setFlags] = useState<Record<ModuleKey, boolean> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const es = language === 'es';
  const de = language === 'de';
  const l = (en: string, esStr: string, deStr: string) => (de ? deStr : es ? esStr : en);

  const stepIndex = step === 'scope' ? 0 : step === 'details' ? 1 : 2;
  const progress = ((stepIndex + 1) / STEP_COUNT) * 100;

  const effectiveArchetype: BusinessArchetype =
    scope === 'individual' ? 'individual' : (archetype || 'general_service');

  const currentFlags = useMemo(
    () => flags ?? suggestedModuleFlags(effectiveArchetype),
    [flags, effectiveArchetype],
  );

  const activePreset: PresetKey = useMemo(() => {
    for (const p of PRESETS) {
      if (!p.modules) continue;
      if (MODULE_LIST.every((m) => !!p.modules![m.key] === !!currentFlags[m.key])) return p.key;
    }
    return 'custom';
  }, [currentFlags]);

  const reset = () => {
    setStep('scope');
    setScope('');
    setArchetype('');
    setOrgName('');
    setCountry('');
    setPropertyName('');
    setPropertyAddress('');
    setFlags(null);
  };

  const exitOnboarding = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const toggleModule = (key: ModuleKey, value: boolean) => {
    const next = { ...currentFlags, [key]: value };
    if (!value) {
      // Turning a module off also turns off whatever depends on it.
      for (const m of MODULE_LIST) if (m.dependencies.includes(key)) next[m.key] = false;
    } else {
      for (const dep of MODULE_LIST.find((m) => m.key === key)!.dependencies) next[dep] = true;
    }
    setFlags(next);
  };

  const ensureTrialSubscription = async () => {
    if (!user) return;
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (existing) return;

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + TRIAL_DAYS);
    await supabase.from('subscriptions').insert({
      user_id: user.id,
      plan_type: 'trial',
      status: 'active',
      amount: 0,
      trial_started_at: start.toISOString(),
      trial_ends_at: end.toISOString(),
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
    });
  };

  const handleWorkerSetup = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await supabase.from('profiles').update({ client_type: 'worker' } as any).eq('id', user.id);
      const { data: existingRole } = await supabase
        .from('user_roles').select('id').eq('user_id', user.id).eq('role', 'worker_marketplace' as any).maybeSingle();
      if (!existingRole) {
        await supabase.from('user_roles').insert({ user_id: user.id, role: 'worker_marketplace' as any });
      }
      await supabase.from('worker_profiles').upsert({ user_id: user.id } as any, { onConflict: 'user_id' });
      await refreshUserData();
      toast.success(l('Welcome! Find jobs on the marketplace', '¡Bienvenido! Encuentra trabajos en el marketplace', 'Willkommen! Finden Sie Jobs auf dem Marktplatz'));
      navigate('/jobs', { replace: true });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScopeContinue = async () => {
    if (!scope) return;
    if (scope === 'worker') {
      await handleWorkerSetup();
      return;
    }
    setStep('details');
  };

  const handleDetailsContinue = () => {
    if (scope === 'business') {
      if (!orgName.trim()) {
        toast.error(l('Enter your business name', 'Ingrese el nombre de su empresa', 'Geben Sie Ihren Firmennamen ein'));
        return;
      }
      if (!archetype) {
        toast.error(l('Select what your business does', 'Seleccione a qué se dedica su empresa', 'Wählen Sie die Tätigkeit Ihres Unternehmens'));
        return;
      }
    } else if (!propertyName.trim()) {
      toast.error(l('Enter the property name', 'Ingrese el nombre de la propiedad', 'Geben Sie den Immobiliennamen ein'));
      return;
    }
    setFlags(suggestedModuleFlags(effectiveArchetype));
    setStep('modules');
  };

  const finish = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const modules = resolveModules(currentFlags, currentFlags);

      if (scope === 'business') {
        const { error } = await (supabase as any).rpc('complete_business_onboarding', {
          p_org_name: orgName.trim(),
          p_archetype: archetype,
          p_country: country || null,
          p_modules: modules,
        });
        if (error) throw error;
      } else {
        // Individual: organization + first property in one transaction.
        if (!profile?.org_id) {
          const { error } = await (supabase as any).rpc('complete_initial_onboarding', {
            p_org_name: propertyName.trim(),
            p_org_type: 'residential',
            p_client_type: 'property_owner',
            p_estate_name: propertyName.trim(),
            p_country: country || null,
            p_address_text: propertyAddress || null,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.from('estates').insert({
            name: propertyName.trim(),
            org_id: profile.org_id,
            country: country || null,
            address_text: propertyAddress || null,
          });
          if (error) throw error;
        }
        const { data: prof } = await supabase.from('profiles').select('org_id').eq('id', user.id).maybeSingle();
        const orgId = (prof as any)?.org_id ?? profile?.org_id;
        if (orgId) {
          await supabase
            .from('organizations')
            .update({
              modules_json: modules as any,
              business_archetype: 'individual',
              account_scope: 'individual',
            } as any)
            .eq('id', orgId);
        }
      }

      await ensureTrialSubscription();
      await refreshUserData();

      toast.success(
        scope === 'business'
          ? l('Your workspace is ready', 'Su espacio de trabajo está listo', 'Ihr Arbeitsbereich ist bereit')
          : l('Property created', 'Propiedad creada', 'Immobilie erstellt'),
      );
      navigate('/', { replace: true });
    } catch (err: any) {
      // Server failures never advance the wizard: values stay on screen so the
      // user can retry the same step.
      const detail = [err?.message, err?.details, err?.hint].filter(Boolean).join(' — ');
      toast.error(l('Setup could not be completed', 'No se pudo completar la configuración', 'Einrichtung nicht abgeschlossen'), {
        description: detail || l('Please try again.', 'Intente de nuevo.', 'Bitte erneut versuchen.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const scopeOptions: { id: Scope; icon: React.ComponentType<{ className?: string }>; title: string; desc: string }[] = [
    {
      id: 'business',
      icon: Building2,
      title: l('I run a business that serves clients', 'Tengo una empresa que atiende clientes', 'Ich führe ein Unternehmen mit Kunden'),
      desc: l(
        'Manage your clients, their projects and the work you do for them.',
        'Gestione sus clientes, sus proyectos y el trabajo que realiza para ellos.',
        'Verwalten Sie Kunden, deren Projekte und Ihre Arbeit.',
      ),
    },
    {
      id: 'individual',
      icon: Home,
      title: l('I manage my own property or assets', 'Gestiono mi propia propiedad o activos', 'Ich verwalte meine eigene Immobilie'),
      desc: l(
        'Track your own property, assets and maintenance.',
        'Gestione su propia propiedad, activos y mantenimiento.',
        'Eigene Immobilie, Anlagen und Wartung verfolgen.',
      ),
    },
    {
      id: 'worker',
      icon: HardHat,
      title: l('I am looking for work', 'Busco trabajo', 'Ich suche Arbeit'),
      desc: l('Find jobs on the marketplace.', 'Encuentre trabajos en el marketplace.', 'Jobs auf dem Marktplatz finden.'),
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 flex items-center justify-between gap-2 border-b border-border">
        <div className="flex items-center gap-2">
          <img src="/images/hg-logo.png" alt="HG" className="w-10 h-10 object-contain" />
          <span className="text-xl font-display font-semibold text-primary">Home Guide</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {l('Restart', 'Reiniciar', 'Neustart')}
          </Button>
          <Button variant="ghost" size="sm" onClick={exitOnboarding}>
            {l('Exit', 'Salir', 'Beenden')}
          </Button>
        </div>
      </header>

      <div className="px-6 pt-4">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {l(`Step ${stepIndex + 1} of ${STEP_COUNT}`, `Paso ${stepIndex + 1} de ${STEP_COUNT}`, `Schritt ${stepIndex + 1} von ${STEP_COUNT}`)}
        </p>
      </div>

      <main className="flex-1 flex items-start sm:items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* STEP 1 — scope */}
          {step === 'scope' && (
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-display">
                  {l('How will you use Home Guide?', '¿Cómo usará Home Guide?', 'Wie werden Sie Home Guide nutzen?')}
                </CardTitle>
                <CardDescription>
                  {l(
                    'This defines the structure of your account. It is not a property yet.',
                    'Esto define la estructura de su cuenta. Todavía no es una propiedad.',
                    'Dies bestimmt die Struktur Ihres Kontos — noch keine Immobilie.',
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {scopeOptions.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setScope(o.id)}
                    className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                      scope === o.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 bg-secondary/30'
                    }`}
                  >
                    <o.icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">{o.title}</p>
                      <p className="text-sm text-muted-foreground">{o.desc}</p>
                    </div>
                  </button>
                ))}

                <Button className="w-full" size="lg" onClick={handleScopeContinue} disabled={!scope || isLoading}>
                  {l('Continue', 'Continuar', 'Weiter')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">{l('or', 'o', 'oder')}</span></div>
                </div>

                <Button variant="outline" className="w-full" onClick={() => navigate('/join-team')}>
                  <Users className="h-4 w-4 mr-2" />
                  {l('I have an invite code', 'Tengo un código de invitación', 'Ich habe einen Einladungscode')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* STEP 2 — business or property details */}
          {step === 'details' && (
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-display">
                  {scope === 'business'
                    ? l('About your business', 'Sobre su empresa', 'Über Ihr Unternehmen')
                    : l('Your first property', 'Su primera propiedad', 'Ihre erste Immobilie')}
                </CardTitle>
                <CardDescription>
                  {scope === 'business'
                    ? l(
                        'We create your business account. Clients and projects are added afterwards.',
                        'Creamos su cuenta de empresa. Los clientes y proyectos se agregan después.',
                        'Wir erstellen Ihr Firmenkonto. Kunden und Projekte folgen danach.',
                      )
                    : l('Add the property you want to manage.', 'Agregue la propiedad que desea gestionar.', 'Fügen Sie die zu verwaltende Immobilie hinzu.')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {scope === 'business' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="orgName">{l('Business name', 'Nombre de la empresa', 'Firmenname')}</Label>
                      <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder={l('Your company name', 'Nombre de su empresa', 'Name Ihres Unternehmens')} />
                    </div>
                    <div className="space-y-2">
                      <Label>{l('What does your business do?', '¿A qué se dedica su empresa?', 'Was macht Ihr Unternehmen?')}</Label>
                      <div className="grid gap-2">
                        {BUSINESS_ARCHETYPES.map((a) => (
                          <button
                            key={a.key}
                            type="button"
                            onClick={() => { setArchetype(a.key); setFlags(null); }}
                            className={`w-full p-3 rounded-lg border text-left transition-all ${
                              archetype === a.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                            }`}
                          >
                            <p className="font-medium text-sm text-foreground">{archetypeLabel(a.key, language)}</p>
                            <p className="text-xs text-muted-foreground">{archetypeDescription(a.key, language)}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="propertyName">{l('Property name', 'Nombre de la propiedad', 'Immobilienname')}</Label>
                      <Input id="propertyName" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="propertyAddress">{l('Address (optional)', 'Dirección (opcional)', 'Adresse (optional)')}</Label>
                      <Input id="propertyAddress" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="country">{l('Country (optional)', 'País (opcional)', 'Land (optional)')}</Label>
                  <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep('scope')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {l('Back', 'Atrás', 'Zurück')}
                  </Button>
                  <Button className="flex-1" onClick={handleDetailsContinue}>
                    {l('Continue', 'Continuar', 'Weiter')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3 — module selection */}
          {step === 'modules' && (
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-display">
                  {l('What do you need to manage?', '¿Qué necesita gestionar?', 'Was möchten Sie verwalten?')}
                </CardTitle>
                <CardDescription>
                  {l(
                    'Pick only what you use. You can change this at any time in settings.',
                    'Elija solo lo que use. Puede cambiarlo cuando quiera en configuración.',
                    'Wählen Sie nur, was Sie nutzen. Jederzeit in den Einstellungen änderbar.',
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>{l('Suggested setups', 'Configuraciones sugeridas', 'Vorgeschlagene Konfigurationen')}</Label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {PRESETS.filter((p) => p.modules).map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setFlags({ ...p.modules! })}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          activePreset === p.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <span className="flex items-center gap-2 font-medium text-sm">
                          {activePreset === p.key && <Check className="h-3.5 w-3.5 text-primary" />}
                          {de ? p.label.de : es ? p.label.es : p.label.en}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {de ? p.description.de : es ? p.description.es : p.description.en}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{l('Functionality', 'Funcionalidad', 'Funktionen')}</Label>
                  <div className="grid gap-2">
                    {MODULE_LIST.map((m) => {
                      const blocked = m.dependencies.filter((d) => !currentFlags[d]);
                      return (
                        <div key={m.key} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border">
                          <div className="flex items-start gap-3 min-w-0">
                            <m.icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">{moduleLabel(m.key, language)}</p>
                              <p className="text-xs text-muted-foreground">{moduleDescription(m.key, language)}</p>
                              {blocked.length > 0 && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                  {l('Requires', 'Requiere', 'Erfordert')}: {blocked.map((d) => moduleLabel(d, language)).join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                          <Switch
                            checked={!!currentFlags[m.key]}
                            onCheckedChange={(v) => toggleModule(m.key, v)}
                            disabled={blocked.length > 0}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep('details')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {l('Back', 'Atrás', 'Zurück')}
                  </Button>
                  <Button className="flex-1" onClick={finish} disabled={isLoading}>
                    {l('Finish setup', 'Finalizar configuración', 'Einrichtung abschließen')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
