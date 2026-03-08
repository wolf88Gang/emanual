import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Leaf, ArrowRight, ArrowLeft, Check, CreditCard, Building2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

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

const STEPS = ['welcome', 'plan', 'payment', 'estate'] as const;
type Step = typeof STEPS[number];

export default function Onboarding() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [estateName, setEstateName] = useState('');
  const [estateCountry, setEstateCountry] = useState('');
  const [estateAddress, setEstateAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const stepIndex = STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const es = language === 'es';

  const nextStep = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1]);
  };

  const prevStep = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1]);
  };

  const handlePayPalPayment = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const plan = plans.find(p => p.id === selectedPlan)!;

      // Create order via edge function
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'paypal-create-order',
        {
          body: {
            plan_type: selectedPlan,
            amount: plan.price.toFixed(2),
          },
        }
      );

      if (orderError) throw orderError;

      const orderId = orderData?.id;
      if (!orderId) throw new Error('No order ID returned');

      // Render PayPal buttons in a modal-like approach
      const container = document.getElementById('paypal-button-container');
      if (container) container.innerHTML = '';

      if (window.paypal) {
        window.paypal.Buttons({
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

              setPaymentComplete(true);
              toast.success(es ? '¡Pago exitoso!' : 'Payment successful!');
              nextStep();
            } catch (err: any) {
              toast.error(err.message || 'Payment capture failed');
            }
          },
          onError: (err: any) => {
            console.error('PayPal error:', err);
            toast.error(es ? 'Error en el pago' : 'Payment error');
          },
        }).render('#paypal-button-container');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEstate = async () => {
    if (!user || !estateName.trim()) {
      toast.error(es ? 'Ingresa el nombre de la propiedad' : 'Enter the estate name');
      return;
    }

    setIsLoading(true);
    try {
      // Create org for the new client if they don't have one
      let orgId = profile?.org_id;

      if (!orgId) {
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({ name: estateName })
          .select('id')
          .single();

        if (orgError) throw orgError;
        orgId = newOrg.id;

        // Update profile with org_id
        await supabase
          .from('profiles')
          .update({ org_id: orgId })
          .eq('id', user.id);
      }

      // Assign owner role if not present
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .maybeSingle();

      if (!existingRole) {
        await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role: 'owner' });
      }

      // Create the estate
      const { error: estateError } = await supabase
        .from('estates')
        .insert({
          name: estateName,
          org_id: orgId,
          country: estateCountry || null,
          address_text: estateAddress || null,
        });

      if (estateError) throw estateError;

      toast.success(es ? '¡Propiedad creada! Bienvenido a Estate Manual' : 'Estate created! Welcome to Estate Manual');
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create estate');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center gap-2 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Leaf className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-serif font-semibold text-primary">Estate Manual</span>
      </header>

      {/* Progress */}
      <div className="px-6 pt-4">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {es ? `Paso ${stepIndex + 1} de ${STEPS.length}` : `Step ${stepIndex + 1} of ${STEPS.length}`}
        </p>
      </div>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Step 1: Welcome */}
          {currentStep === 'welcome' && (
            <Card className="border-0 shadow-xl">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-3xl font-serif">
                  {es ? '¡Bienvenido a Estate Manual!' : 'Welcome to Estate Manual!'}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {es
                    ? 'Configura tu cuenta en minutos. Gestiona activos vivos, intención de diseño y riesgo a largo plazo.'
                    : 'Set up your account in minutes. Manage living assets, design intent, and long-term risk.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-3">
                  {[
                    { icon: '🌿', text: es ? 'Gestión digital de propiedades' : 'Digital estate management' },
                    { icon: '📋', text: es ? 'Tareas, activos y documentos' : 'Tasks, assets & documents' },
                    { icon: '👥', text: es ? 'Gestión de equipo y contratistas' : 'Team & vendor management' },
                    { icon: '🗺️', text: es ? 'Mapa interactivo con zonas' : 'Interactive map with zones' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-sm font-medium text-foreground">{item.text}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full" size="lg" onClick={nextStep}>
                  {es ? 'Comenzar' : 'Get Started'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Select Plan */}
          {currentStep === 'plan' && (
            <Card className="border-0 shadow-xl">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <CreditCard className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-serif">
                  {es ? 'Elige tu plan' : 'Choose your plan'}
                </CardTitle>
                <CardDescription>
                  {es ? 'Selecciona el plan que mejor se adapte a tu necesidad' : 'Select the plan that best fits your needs'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedPlan === plan.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-foreground text-lg">
                          {es ? plan.nameEs : plan.name}
                        </div>
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
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedPlan === plan.id ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                      }`}>
                        {selectedPlan === plan.id && <Check className="h-4 w-4 text-primary-foreground" />}
                      </div>
                    </div>
                  </button>
                ))}

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

          {/* Step 3: Payment */}
          {currentStep === 'payment' && (
            <Card className="border-0 shadow-xl">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <CreditCard className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-serif">
                  {es ? 'Método de pago' : 'Payment'}
                </CardTitle>
                <CardDescription>
                  {es
                    ? `Plan ${selectedPlan === 'monthly' ? 'Mensual' : 'Anual'} — $${plans.find(p => p.id === selectedPlan)!.price}`
                    : `${selectedPlan === 'monthly' ? 'Monthly' : 'Annual'} Plan — $${plans.find(p => p.id === selectedPlan)!.price}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {paymentComplete ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                      <Check className="h-8 w-8 text-accent-foreground" />
                    </div>
                    <p className="text-lg font-semibold text-foreground">
                      {es ? '¡Pago completado!' : 'Payment complete!'}
                    </p>
                    <Button className="mt-4" onClick={nextStep}>
                      {es ? 'Crear mi propiedad' : 'Create my estate'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div id="paypal-button-container" className="min-h-[50px]" />
                    {!document.getElementById('paypal-button-container')?.hasChildNodes() && (
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handlePayPalPayment}
                        disabled={isLoading}
                      >
                        {isLoading
                          ? (es ? 'Procesando...' : 'Processing...')
                          : (es ? 'Pagar con PayPal' : 'Pay with PayPal')}
                      </Button>
                    )}
                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" onClick={prevStep} className="flex-1">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {es ? 'Atrás' : 'Back'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Create Estate */}
          {currentStep === 'estate' && (
            <Card className="border-0 shadow-xl">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-serif">
                  {es ? 'Crea tu primera propiedad' : 'Create your first estate'}
                </CardTitle>
                <CardDescription>
                  {es ? 'Configura la información básica de tu propiedad' : 'Set up your estate basic information'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="estateName">
                    {es ? 'Nombre de la propiedad *' : 'Estate name *'}
                  </Label>
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
                    placeholder={es ? 'Dirección de la propiedad' : 'Estate address'}
                    value={estateAddress}
                    onChange={(e) => setEstateAddress(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={prevStep} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {es ? 'Atrás' : 'Back'}
                  </Button>
                  <Button
                    onClick={handleCreateEstate}
                    className="flex-1"
                    disabled={isLoading || !estateName.trim()}
                  >
                    {isLoading
                      ? (es ? 'Creando...' : 'Creating...')
                      : (es ? 'Crear propiedad' : 'Create estate')}
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
