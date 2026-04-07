import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Check, Building2, RotateCcw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PRICE_PER_PROPERTY, TRIAL_DAYS } from '@/contexts/SubscriptionContext';

declare global {
  interface Window {
    paypal?: any;
  }
}

type ClientType = 'property_owner' | 'landscaping_company' | 'property_management' | 'hybrid' | 'worker' | 'other';
type Step = 'profile' | 'plan' | 'estate';

const STEPS: Step[] = ['profile', 'plan', 'estate'];

const CLIENT_TYPE_OPTIONS: {
  id: ClientType;
  label: string;
  labelEs: string;
  labelDe: string;
  description: string;
  descriptionEs: string;
  descriptionDe: string;
  emoji: string;
}[] = [
  {
    id: 'property_owner',
    label: 'Property Owner',
    labelEs: 'Dueño de propiedad',
    labelDe: 'Immobilienbesitzer',
    description: 'I manage my own properties',
    descriptionEs: 'Gestiono mis propias propiedades',
    descriptionDe: 'Ich verwalte meine eigenen Immobilien',
    emoji: '🏡',
  },
  {
    id: 'landscaping_company',
    label: 'Landscaping Company',
    labelEs: 'Empresa de landscaping',
    labelDe: 'Landschaftsbau-Unternehmen',
    description: 'I manage client properties',
    descriptionEs: 'Gestiono propiedades de clientes',
    descriptionDe: 'Ich verwalte Kundenimmobilien',
    emoji: '🏢',
  },
  {
    id: 'property_management',
    label: 'Property Manager',
    labelEs: 'Administrador de propiedades',
    labelDe: 'Immobilienverwalter',
    description: 'I manage villas or rentals for owners',
    descriptionEs: 'Administro villas o alquileres para dueños',
    descriptionDe: 'Ich verwalte Villen oder Mietobjekte für Eigentümer',
    emoji: '🏘️',
  },
  {
    id: 'hybrid',
    label: 'Both',
    labelEs: 'Ambos',
    labelDe: 'Beides',
    description: 'I manage private and client properties',
    descriptionEs: 'Gestiono propiedades privadas y de clientes',
    descriptionDe: 'Ich verwalte private und Kundenimmobilien',
    emoji: '🔀',
  },
  {
    id: 'worker',
    label: 'Looking for work',
    labelEs: 'Busco trabajo',
    labelDe: 'Arbeit suchen',
    description: 'I want to find landscaping jobs near me',
    descriptionEs: 'Quiero encontrar trabajos de jardinería cerca de mí',
    descriptionDe: 'Ich möchte Gartenbauarbeiten in meiner Nähe finden',
    emoji: '👷',
  },
  {
    id: 'other',
    label: 'Other',
    labelEs: 'Otro',
    labelDe: 'Andere',
    description: 'I need a custom setup',
    descriptionEs: 'Necesito una configuración personalizada',
    descriptionDe: 'Ich brauche eine individuelle Konfiguration',
    emoji: '⚙️',
  },
];

export default function Onboarding() {
  const { user, profile, signOut } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<Step>('profile');
  const [selectedClientType, setSelectedClientType] = useState<ClientType | ''>('');
  const [estateName, setEstateName] = useState('');
  const [estateCountry, setEstateCountry] = useState('');
  const [estateAddress, setEstateAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<'trial' | 'paid' | ''>('');

  const stepIndex = STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const es = language === 'es';
  const de = language === 'de';

  const l = (en: string, esStr: string, deStr: string) => de ? deStr : es ? esStr : en;

  const resetWizard = () => {
    setCurrentStep('profile');
    setSelectedClientType('');
    setSelectedPath('');
    setEstateName('');
    setEstateCountry('');
    setEstateAddress('');
  };

  const nextStep = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1]);
  };

  const prevStep = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1]);
  };

  const handleCancelOnboarding = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const handleProfileContinue = async () => {
    if (!selectedClientType) {
      toast.error(l('Please select an account type', 'Selecciona un tipo de cuenta', 'Bitte wählen Sie einen Kontotyp'));
      return;
    }
    // Workers skip estate creation — go directly to marketplace
    if (selectedClientType === 'worker') {
      await handleWorkerSetup();
      return;
    }
    nextStep();
  };

  const handleWorkerSetup = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Update profile with client_type
      await supabase.from('profiles').update({ client_type: 'worker' } as any).eq('id', user.id);
      // Add worker_marketplace role
      const { data: existingRole } = await supabase.from('user_roles').select('id').eq('user_id', user.id).eq('role', 'worker_marketplace' as any).maybeSingle();
      if (!existingRole) {
        await supabase.from('user_roles').insert({ user_id: user.id, role: 'worker_marketplace' as any });
      }
      // Create worker profile
      await supabase.from('worker_profiles').upsert({ user_id: user.id } as any, { onConflict: 'user_id' });
      toast.success(l('Welcome! Find jobs on the marketplace', '¡Bienvenido! Encuentra trabajos en el marketplace', 'Willkommen! Finden Sie Jobs auf dem Marktplatz'));
      navigate('/jobs', { replace: true });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTrial = () => {
    setSelectedPath('trial');
    setCurrentStep('estate');
  };

  const handleCreateEstate = async () => {
    if (!user || !estateName.trim()) {
      toast.error(l('Enter the property name', 'Ingresa el nombre de la propiedad', 'Geben Sie den Immobiliennamen ein'));
      return;
    }

    setIsLoading(true);
    try {
      let orgId = profile?.org_id;

      if (!orgId) {
        const orgTypeMap: Record<string, string> = {
          property_owner: 'residential',
          landscaping_company: 'landscaping_company',
          hybrid: 'hybrid',
          other: 'residential',
        };
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({ name: estateName, org_type: orgTypeMap[selectedClientType] || 'residential' } as any)
          .select('id')
          .single();
        if (orgError) throw orgError;
        orgId = newOrg.id;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ org_id: orgId, client_type: selectedClientType || null } as any)
        .eq('id', user.id);
      if (profileError) throw profileError;

      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .maybeSingle();

      if (!existingRole) {
        const { error: roleError } = await supabase.from('user_roles').insert({ user_id: user.id, role: 'owner' });
        if (roleError) throw roleError;
      }

      const { error: estateError } = await supabase.from('estates').insert({
        name: estateName,
        org_id: orgId,
        country: estateCountry || null,
        address_text: estateAddress || null,
      });
      if (estateError) throw estateError;

      // Create trial subscription (1 property, 15 days)
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingSub) {
        const trialStart = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

        await supabase.from('subscriptions').insert({
          user_id: user.id,
          plan_type: 'trial',
          status: 'active',
          amount: 0,
          trial_started_at: trialStart.toISOString(),
          trial_ends_at: trialEnd.toISOString(),
          current_period_start: trialStart.toISOString(),
          current_period_end: trialEnd.toISOString(),
        });
      }

      toast.success(l('Property created! Welcome to Home Guide', '¡Propiedad creada! Bienvenido a Home Guide', 'Immobilie erstellt! Willkommen bei Home Guide'));
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err.message || l('Failed to create property', 'No se pudo crear la propiedad', 'Immobilie konnte nicht erstellt werden'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 flex items-center justify-between gap-2 border-b border-border">
        <div className="flex items-center gap-2">
          <img src="/images/hg-logo.png" alt="HG" className="w-10 h-10 object-contain" />
          <span className="text-xl font-serif font-semibold text-primary">Home Guide</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetWizard}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {l('Restart', 'Reiniciar', 'Neustart')}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancelOnboarding}>
            {l('Exit', 'Salir', 'Beenden')}
          </Button>
        </div>
      </header>

      <div className="px-6 pt-4">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {l(`Step ${stepIndex + 1} of ${STEPS.length}`, `Paso ${stepIndex + 1} de ${STEPS.length}`, `Schritt ${stepIndex + 1} von ${STEPS.length}`)}
        </p>
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          {currentStep === 'profile' && (
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-serif">
                  {l('What type of account do you want to create?', '¿Qué tipo de cuenta quieres crear?', 'Welche Art von Konto möchten Sie erstellen?')}
                </CardTitle>
                <CardDescription>
                  {l('Select one option to personalize the platform.', 'Selecciona una opción para personalizar la plataforma.', 'Wählen Sie eine Option, um die Plattform zu personalisieren.')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={selectedClientType}
                  onValueChange={(value) => setSelectedClientType(value as ClientType)}
                  className="space-y-3"
                >
                  {CLIENT_TYPE_OPTIONS.map((option) => {
                    const selected = selectedClientType === option.id;
                    return (
                      <label
                        key={option.id}
                        htmlFor={option.id}
                        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 bg-secondary/30'
                        }`}
                      >
                        <RadioGroupItem id={option.id} value={option.id} className="mt-1" />
                        <div className="flex items-start gap-3 flex-1">
                          <span className="text-lg mt-0.5">{option.emoji}</span>
                          <div>
                            <p className="font-semibold text-foreground text-base">
                              {de ? option.labelDe : es ? option.labelEs : option.label}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {de ? option.descriptionDe : es ? option.descriptionEs : option.description}
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>

                <Button className="w-full" size="lg" onClick={handleProfileContinue} disabled={!selectedClientType}>
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

          {currentStep === 'plan' && (
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-serif">
                  {l('How would you like to start?', '¿Cómo te gustaría empezar?', 'Wie möchten Sie beginnen?')}
                </CardTitle>
                <CardDescription>
                  {l(
                    `Home Guide is $${PRICE_PER_PROPERTY}/month per property. All features included.`,
                    `Home Guide cuesta $${PRICE_PER_PROPERTY}/mes por propiedad. Todas las funciones incluidas.`,
                    `Home Guide kostet $${PRICE_PER_PROPERTY}/Monat pro Immobilie. Alle Funktionen inklusive.`
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Paid option */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPath('paid');
                    setCurrentStep('estate');
                  }}
                  className="w-full p-5 rounded-xl border-2 border-primary/50 text-left transition-all hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-lg">
                        {l('Subscribe', 'Suscribirse', 'Abonnieren')}
                      </div>
                      <div className="text-2xl font-bold text-primary mt-1">
                        ${PRICE_PER_PROPERTY}<span className="text-sm font-normal text-muted-foreground">
                          {l('/mo per property', '/mes por propiedad', '/Monat pro Immobilie')}
                        </span>
                      </div>
                      <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> {l('Unlimited assets & zones', 'Activos y zonas ilimitados', 'Unbegrenzte Assets & Zonen')}</li>
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> {l('Reports, PDF export, AI', 'Reportes, PDF, IA', 'Berichte, PDF-Export, KI')}</li>
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> {l('Labor & CRM tools', 'Herramientas laborales y CRM', 'Arbeits- & CRM-Tools')}</li>
                      </ul>
                    </div>
                  </div>
                </button>

                {/* Divider */}
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">{l('or', 'o', 'oder')}</span></div>
                </div>

                {/* Trial option */}
                <button
                  type="button"
                  onClick={handleStartTrial}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-accent/50 text-left transition-all hover:border-accent hover:bg-accent/5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎁</span>
                    <div>
                      <div className="font-semibold text-foreground">
                        {l(`${TRIAL_DAYS}-Day Free Trial`, `Prueba gratuita de ${TRIAL_DAYS} días`, `${TRIAL_DAYS}-Tage Testversion`)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {l(
                          '1 property · Max 3 assets · No reports or PDF export',
                          '1 propiedad · Máx 3 activos · Sin reportes ni PDF',
                          '1 Immobilie · Max 3 Assets · Keine Berichte oder PDF'
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={prevStep} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {l('Back', 'Atrás', 'Zurück')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'estate' && (
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-2xl font-serif text-center">
                  {l('Create your first property', 'Crea tu primera propiedad', 'Erstellen Sie Ihre erste Immobilie')}
                </CardTitle>
                <CardDescription className="text-center">
                  {selectedPath === 'trial'
                    ? l(
                        `${TRIAL_DAYS}-day free trial · 1 property included`,
                        `Prueba de ${TRIAL_DAYS} días · 1 propiedad incluida`,
                        `${TRIAL_DAYS}-Tage Test · 1 Immobilie inklusive`
                      )
                    : l(
                        `$${PRICE_PER_PROPERTY}/mo · All features included`,
                        `$${PRICE_PER_PROPERTY}/mes · Todas las funciones incluidas`,
                        `$${PRICE_PER_PROPERTY}/Monat · Alle Funktionen inklusive`
                      )
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="estateName">{l('Property name *', 'Nombre de la propiedad *', 'Immobilienname *')}</Label>
                  <Input
                    id="estateName"
                    placeholder={l('e.g. Villa Hermosa', 'Ej: Villa Hermosa', 'z.B. Villa Hermosa')}
                    value={estateName}
                    onChange={(e) => setEstateName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estateCountry">{l('Country', 'País', 'Land')}</Label>
                  <Input
                    id="estateCountry"
                    placeholder={l('e.g. Costa Rica', 'Ej: Costa Rica', 'z.B. Costa Rica')}
                    value={estateCountry}
                    onChange={(e) => setEstateCountry(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estateAddress">{l('Address', 'Dirección', 'Adresse')}</Label>
                  <Input
                    id="estateAddress"
                    placeholder={l('Property address', 'Dirección de la propiedad', 'Immobilienadresse')}
                    value={estateAddress}
                    onChange={(e) => setEstateAddress(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={prevStep} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {l('Back', 'Atrás', 'Zurück')}
                  </Button>
                  <Button onClick={handleCreateEstate} className="flex-1" disabled={isLoading || !estateName.trim()}>
                    {isLoading ? l('Creating...', 'Creando...', 'Erstellen...') : l('Finish', 'Finalizar', 'Abschließen')}
                    <Check className="ml-2 h-4 w-4" />
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
