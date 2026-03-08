import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Leaf, ArrowRight, ArrowLeft, Check, CreditCard, Building2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

declare global {
  interface Window {
    paypal?: any;
  }
}

interface PlanOption {
  id: 'monthly' | 'annual';
  name: string;
  nameEs: string;
  price: number;
  period: string;
  periodEs: string;
  savings?: string;
  savingsEs?: string;
}

type ClientType = 'property_owner' | 'landscaping_company' | 'hybrid' | 'other';
type Step = 'profile' | 'plan' | 'payment' | 'estate';

const plans: PlanOption[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    nameEs: 'Mensual',
    price: 19.99,
    period: '/month',
    periodEs: '/mes',
  },
  {
    id: 'annual',
    name: 'Annual',
    nameEs: 'Anual',
    price: 199.99,
    period: '/year',
    periodEs: '/año',
    savings: 'Save ~17%',
    savingsEs: 'Ahorra ~17%',
  },
];

const STEPS: Step[] = ['profile', 'plan', 'payment', 'estate'];

const CLIENT_TYPE_OPTIONS: {
  id: ClientType;
  label: string;
  labelEs: string;
  description: string;
  descriptionEs: string;
  emoji: string;
}[] = [
  {
    id: 'property_owner',
    label: 'Property Owner',
    labelEs: 'Dueño de propiedad',
    description: 'I manage my own properties',
    descriptionEs: 'Gestiono mis propias propiedades',
    emoji: '🏡',
  },
  {
    id: 'landscaping_company',
    label: 'Landscaping Company',
    labelEs: 'Empresa de landscaping',
    description: 'I manage client properties',
    descriptionEs: 'Gestiono propiedades de clientes',
    emoji: '🏢',
  },
  {
    id: 'hybrid',
    label: 'Both',
    labelEs: 'Ambos',
    description: 'I manage private and client properties',
    descriptionEs: 'Gestiono propiedades privadas y de clientes',
    emoji: '🔀',
  },
  {
    id: 'other',
    label: 'Other',
    labelEs: 'Otro',
    description: 'I need a custom setup',
    descriptionEs: 'Necesito una configuración personalizada',
    emoji: '⚙️',
  },
];

export default function Onboarding() {
  const { user, profile, signOut } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<Step>('profile');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [selectedClientType, setSelectedClientType] = useState<ClientType | ''>('');
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [estateName, setEstateName] = useState('');
  const [estateCountry, setEstateCountry] = useState('');
  const [estateAddress, setEstateAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const stepIndex = STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const es = language === 'es';

  const resetWizard = () => {
    setCurrentStep('profile');
    setSelectedPlan('monthly');
    setSelectedClientType('');
    setPaymentComplete(false);
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

  const handleProfileContinue = () => {
    if (!selectedClientType) {
      toast.error(es ? 'Selecciona un tipo de cuenta' : 'Please select an account type');
      return;
    }
    nextStep();
  };

  const handlePayPalPayment = async () => {
    if (!user) return;
    if (!window.paypal) {
      toast.error(es ? 'PayPal no está disponible en este momento' : 'PayPal is not available right now');
      return;
    }

    setIsLoading(true);

    try {
      const plan = plans.find((p) => p.id === selectedPlan)!;

      const { data: orderData, error: orderError } = await supabase.functions.invoke('paypal-create-order', {
        body: {
          plan_type: selectedPlan,
          amount: plan.price.toFixed(2),
        },
      });

      if (orderError) throw orderError;

      const orderId = orderData?.id;
      if (!orderId) throw new Error('No order ID returned');

      const container = document.getElementById('paypal-button-container');
      if (!container) return;
      container.innerHTML = '';

      window.paypal
        .Buttons({
          createOrder: () => orderId,
          onApprove: async (data: any) => {
            try {
              const { data: captureData, error: captureError } = await supabase.functions.invoke(
                'paypal-capture-order',
                {
                  body: {
                    order_id: data.orderID,
                    user_id: user.id,
                    plan_type: selectedPlan,
                    amount: plan.price,
                  },
                }
              );

              if (captureError) throw captureError;
              if (captureData?.error) throw new Error(captureData.message || 'Payment capture failed');

              setPaymentComplete(true);
              toast.success(es ? '¡Pago exitoso!' : 'Payment successful!');
            } catch (err: any) {
              toast.error(err.message || (es ? 'Error al confirmar el pago' : 'Payment capture failed'));
            }
          },
          onError: () => {
            toast.error(es ? 'Error en el pago' : 'Payment error');
          },
        })
        .render('#paypal-button-container');
    } catch (err: any) {
      toast.error(err.message || (es ? 'No se pudo iniciar el pago' : 'Failed to start payment'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEstate = async () => {
    if (!user || !estateName.trim()) {
      toast.error(es ? 'Ingresa el nombre de la propiedad' : 'Enter the property name');
      return;
    }

    setIsLoading(true);
    try {
      let orgId = profile?.org_id;

      if (!orgId) {
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({ name: estateName })
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

      toast.success(es ? '¡Propiedad creada! Bienvenido a Home Guide' : 'Property created! Welcome to Home Guide');
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err.message || (es ? 'No se pudo crear la propiedad' : 'Failed to create property'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 flex items-center justify-between gap-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-serif font-semibold text-primary">Home Guide</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetWizard}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {es ? 'Reiniciar' : 'Restart'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancelOnboarding}>
            {es ? 'Salir' : 'Exit'}
          </Button>
        </div>
      </header>

      <div className="px-6 pt-4">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {es ? `Paso ${stepIndex + 1} de ${STEPS.length}` : `Step ${stepIndex + 1} of ${STEPS.length}`}
        </p>
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          {currentStep === 'profile' && (
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-serif">
                  {es ? '¿Qué tipo de cuenta quieres crear?' : 'What type of account do you want to create?'}
                </CardTitle>
                <CardDescription>
                  {es
                    ? 'Selecciona una opción para personalizar la plataforma.'
                    : 'Select one option to personalize the platform.'}
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
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40 bg-secondary/30'
                        }`}
                      >
                        <RadioGroupItem id={option.id} value={option.id} className="mt-1" />
                        <div className="flex items-start gap-3 flex-1">
                          <span className="text-lg mt-0.5">{option.emoji}</span>
                          <div>
                            <p className="font-semibold text-foreground text-base">
                              {es ? option.labelEs : option.label}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {es ? option.descriptionEs : option.description}
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>

                <Button className="w-full" size="lg" onClick={handleProfileContinue} disabled={!selectedClientType}>
                  {es ? 'Continuar' : 'Continue'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {currentStep === 'plan' && (
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-serif">{es ? 'Elige tu plan' : 'Choose your plan'}</CardTitle>
                <CardDescription>
                  {es ? 'Puedes cambiar de plan más adelante.' : 'You can change your plan later.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {plans.map((plan) => {
                  const selected = selectedPlan === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-foreground text-lg">{es ? plan.nameEs : plan.name}</div>
                          <div className="text-2xl font-bold text-primary mt-1">
                            ${plan.price}
                            <span className="text-sm font-normal text-muted-foreground">
                              {es ? plan.periodEs : plan.period}
                            </span>
                          </div>
                          {plan.savings && (
                            <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                              {es ? plan.savingsEs : plan.savings}
                            </span>
                          )}
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                          }`}
                        >
                          {selected && <Check className="h-4 w-4 text-primary-foreground" />}
                        </div>
                      </div>
                    </button>
                  );
                })}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={prevStep} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {es ? 'Atrás' : 'Back'}
                  </Button>
                  <Button onClick={nextStep} className="flex-1">
                    {es ? 'Continuar' : 'Continue'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'payment' && (
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-serif">{es ? 'Pago' : 'Payment'}</CardTitle>
                <CardDescription>
                  {es
                    ? `Plan ${selectedPlan === 'monthly' ? 'Mensual' : 'Anual'} — $${plans.find((p) => p.id === selectedPlan)?.price}`
                    : `${selectedPlan === 'monthly' ? 'Monthly' : 'Annual'} plan — $${plans.find((p) => p.id === selectedPlan)?.price}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentComplete ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                      <Check className="h-8 w-8 text-accent-foreground" />
                    </div>
                    <p className="text-lg font-semibold text-foreground">
                      {es ? '¡Pago completado!' : 'Payment complete!'}
                    </p>
                    <Button className="mt-4" onClick={nextStep}>
                      {es ? 'Continuar a propiedad' : 'Continue to property'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button className="w-full" size="lg" onClick={handlePayPalPayment} disabled={isLoading}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      {isLoading
                        ? es
                          ? 'Preparando PayPal...'
                          : 'Preparing PayPal...'
                        : es
                          ? 'Pagar con PayPal'
                          : 'Pay with PayPal'}
                    </Button>
                    <div id="paypal-button-container" className="min-h-[52px]" />
                    <p className="text-xs text-muted-foreground text-center">
                      {es
                        ? 'Haz clic en “Pagar con PayPal” para mostrar los botones de pago.'
                        : 'Click “Pay with PayPal” to load the payment buttons.'}
                    </p>
                  </>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={prevStep} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {es ? 'Atrás' : 'Back'}
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
                  {es ? 'Crea tu primera propiedad' : 'Create your first property'}
                </CardTitle>
                <CardDescription className="text-center">
                  {es ? 'Último paso para entrar a Home Guide.' : 'Final step before entering Home Guide.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="estateName">{es ? 'Nombre de la propiedad *' : 'Property name *'}</Label>
                  <Input
                    id="estateName"
                    placeholder={es ? 'Ej: Villa Hermosa' : 'e.g. Villa Hermosa'}
                    value={estateName}
                    onChange={(e) => setEstateName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estateCountry">{es ? 'País' : 'Country'}</Label>
                  <Input
                    id="estateCountry"
                    placeholder={es ? 'Ej: Costa Rica' : 'e.g. Costa Rica'}
                    value={estateCountry}
                    onChange={(e) => setEstateCountry(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estateAddress">{es ? 'Dirección' : 'Address'}</Label>
                  <Input
                    id="estateAddress"
                    placeholder={es ? 'Dirección de la propiedad' : 'Property address'}
                    value={estateAddress}
                    onChange={(e) => setEstateAddress(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={prevStep} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {es ? 'Atrás' : 'Back'}
                  </Button>
                  <Button onClick={handleCreateEstate} className="flex-1" disabled={isLoading || !estateName.trim()}>
                    {isLoading ? (es ? 'Creando...' : 'Creating...') : es ? 'Finalizar' : 'Finish'}
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
