import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

declare global {
  interface Window {
    paypal?: any;
  }
}

interface Plan {
  id: 'monthly' | 'annual';
  price: string;
  priceNum: number;
  period: string;
  periodEs: string;
  savings?: string;
  savingsEs?: string;
}

const plans: Plan[] = [
  {
    id: 'monthly',
    price: '$19.99',
    priceNum: 19.99,
    period: '/month',
    periodEs: '/mes',
  },
  {
    id: 'annual',
    price: '$199.99',
    priceNum: 199.99,
    period: '/year',
    periodEs: '/año',
    savings: 'Save $39.89/year',
    savingsEs: 'Ahorra $39.89/año',
  },
];

const features = [
  { en: 'Unlimited assets & zones', es: 'Activos y zonas ilimitados' },
  { en: 'Weather alerts & automation', es: 'Alertas meteorológicas y automatización' },
  { en: 'Labor management & shifts', es: 'Gestión de mano de obra y turnos' },
  { en: 'QR check-in system', es: 'Sistema de check-in QR' },
  { en: 'Document storage', es: 'Almacenamiento de documentos' },
  { en: 'Topography & risk analysis', es: 'Topografía y análisis de riesgos' },
  { en: 'Plant care protocols (AI)', es: 'Protocolos de cuidado (IA)' },
  { en: 'Priority support', es: 'Soporte prioritario' },
];

export default function Subscription() {
  const { language } = useLanguage();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const paypalRef = useRef<HTMLDivElement>(null);
  const buttonsRendered = useRef(false);

  // Fetch current subscription
  useEffect(() => {
    async function fetchSub() {
      if (!user) return;
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setCurrentSub(data);
      setLoading(false);
    }
    fetchSub();
  }, [user]);

  // Render PayPal buttons
  useEffect(() => {
    if (!window.paypal || !paypalRef.current || buttonsRendered.current) return;
    if (currentSub?.status === 'active') return;

    buttonsRendered.current = true;

    window.paypal
      .Buttons({
        style: {
          shape: 'rect',
          color: 'gold',
          layout: 'vertical',
          label: 'subscribe',
        },
        createOrder: async () => {
          const { data, error } = await supabase.functions.invoke('paypal-create-order', {
            body: { plan_type: selectedPlan },
          });
          if (error) throw error;
          return data.id;
        },
        onApprove: async (data: any) => {
          const { error } = await supabase.functions.invoke('paypal-capture-order', {
            body: { order_id: data.orderID, plan_type: selectedPlan },
          });
          if (error) {
            toast.error(language === 'es' ? 'Error al procesar el pago' : 'Error processing payment');
            return;
          }
          toast.success(
            language === 'es' ? '¡Suscripción activada!' : 'Subscription activated!'
          );
          // Refresh subscription state
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user!.id)
            .maybeSingle();
          setCurrentSub(sub);
        },
        onError: (err: any) => {
          console.error('PayPal error:', err);
          toast.error(language === 'es' ? 'Error con PayPal' : 'PayPal error');
        },
      })
      .render(paypalRef.current);
  }, [window.paypal, currentSub, loading]);

  // Re-render buttons when plan changes
  useEffect(() => {
    if (!paypalRef.current || !buttonsRendered.current) return;
    // Clear and re-render
    buttonsRendered.current = false;
    paypalRef.current.innerHTML = '';
    
    if (!window.paypal || currentSub?.status === 'active') return;
    buttonsRendered.current = true;

    window.paypal
      .Buttons({
        style: {
          shape: 'rect',
          color: 'gold',
          layout: 'vertical',
          label: 'subscribe',
        },
        createOrder: async () => {
          const { data, error } = await supabase.functions.invoke('paypal-create-order', {
            body: { plan_type: selectedPlan },
          });
          if (error) throw error;
          return data.id;
        },
        onApprove: async (data: any) => {
          const { error } = await supabase.functions.invoke('paypal-capture-order', {
            body: { order_id: data.orderID, plan_type: selectedPlan },
          });
          if (error) {
            toast.error(language === 'es' ? 'Error al procesar el pago' : 'Error processing payment');
            return;
          }
          toast.success(
            language === 'es' ? '¡Suscripción activada!' : 'Subscription activated!'
          );
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user!.id)
            .maybeSingle();
          setCurrentSub(sub);
        },
        onError: (err: any) => {
          console.error('PayPal error:', err);
          toast.error(language === 'es' ? 'Error con PayPal' : 'PayPal error');
        },
      })
      .render(paypalRef.current);
  }, [selectedPlan]);

  const isActive = currentSub?.status === 'active';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-serif font-semibold text-foreground">
            {language === 'es' ? 'Suscripción' : 'Subscription'}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Active subscription banner */}
        {isActive && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {language === 'es' ? 'Suscripción Activa' : 'Active Subscription'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'es' ? 'Plan' : 'Plan'}: {currentSub.plan_type === 'annual' ? (language === 'es' ? 'Anual' : 'Annual') : (language === 'es' ? 'Mensual' : 'Monthly')}
                  {' · '}
                  {language === 'es' ? 'Vence' : 'Expires'}: {new Date(currentSub.current_period_end).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan selection */}
        {!isActive && (
          <>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-serif font-bold text-foreground">
                {language === 'es' ? 'Elige tu plan' : 'Choose your plan'}
              </h2>
              <p className="text-muted-foreground">
                {language === 'es'
                  ? 'Acceso completo a todas las funciones de Estate Manual'
                  : 'Full access to all Estate Manual features'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all ${
                    selectedPlan === plan.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/40'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {plan.id === 'annual'
                          ? language === 'es' ? 'Anual' : 'Annual'
                          : language === 'es' ? 'Mensual' : 'Monthly'}
                      </CardTitle>
                      {plan.savings && (
                        <Badge variant="secondary" className="text-xs">
                          {language === 'es' ? plan.savingsEs : plan.savings}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">
                        {language === 'es' ? plan.periodEs : plan.period}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* PayPal buttons container */}
            <div className="max-w-md mx-auto">
              <div ref={paypalRef} className="min-h-[150px]" />
            </div>
          </>
        )}

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {language === 'es' ? 'Incluido en tu plan' : 'Included in your plan'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">
                    {language === 'es' ? f.es : f.en}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          {language === 'es'
            ? 'Los pagos se procesan de forma segura a través de PayPal. Modo sandbox activo.'
            : 'Payments are securely processed via PayPal. Sandbox mode active.'}
        </p>
      </main>
    </div>
  );
}
