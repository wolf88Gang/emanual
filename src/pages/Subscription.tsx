import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, ArrowLeft, Shield, Building2, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { useSubscription, PRICE_PER_PROPERTY } from '@/contexts/SubscriptionContext';
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

const features = [
  { en: 'Unlimited assets & zones per property', es: 'Activos y zonas ilimitados por propiedad', de: 'Unbegrenzte Assets & Zonen pro Immobilie' },
  { en: 'Weather alerts & automation', es: 'Alertas meteorológicas y automatización', de: 'Wetterwarnung & Automatisierung' },
  { en: 'Labor management & shifts', es: 'Gestión de mano de obra y turnos', de: 'Arbeitsverwaltung & Schichten' },
  { en: 'QR check-in system', es: 'Sistema de check-in QR', de: 'QR-Check-in-System' },
  { en: 'Document storage', es: 'Almacenamiento de documentos', de: 'Dokumentenspeicher' },
  { en: 'Topography & risk analysis', es: 'Topografía y análisis de riesgos', de: 'Topografie & Risikoanalyse' },
  { en: 'Plant care protocols', es: 'Protocolos de cuidado', de: 'Pflegeprotokolle' },
  { en: 'Reports & PDF export', es: 'Reportes y exportar PDF', de: 'Berichte & PDF-Export' },
];

export default function Subscription() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { estates } = useEstate();
  const { isPaid, isTrial, trialDaysLeft, paidPropertyCount, status } = useSubscription();
  const navigate = useNavigate();
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const paypalRef = useRef<HTMLDivElement>(null);
  const buttonsRendered = useRef(false);

  const es = language === 'es';
  const de = language === 'de';
  const l = (en: string, esStr: string, deStr: string) => de ? deStr : es ? esStr : en;

  const propertyCount = estates.length;
  const totalMonthly = propertyCount * PRICE_PER_PROPERTY;

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
    if (isPaid) return;

    buttonsRendered.current = true;

    window.paypal
      .Buttons({
        style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },
        createOrder: async () => {
          const amount = Math.max(propertyCount, 1) * PRICE_PER_PROPERTY;
          const { data, error } = await supabase.functions.invoke('paypal-create-order', {
            body: { plan_type: 'monthly', amount: amount.toFixed(2) },
          });
          if (error) throw error;
          return data.id;
        },
        onApprove: async (data: any) => {
          const amount = Math.max(propertyCount, 1) * PRICE_PER_PROPERTY;
          const { error } = await supabase.functions.invoke('paypal-capture-order', {
            body: { order_id: data.orderID, plan_type: 'monthly', amount },
          });
          if (error) {
            toast.error(l('Error processing payment', 'Error al procesar el pago', 'Fehler bei der Zahlung'));
            return;
          }
          toast.success(l('Subscription activated!', '¡Suscripción activada!', 'Abonnement aktiviert!'));
          const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', user!.id).maybeSingle();
          setCurrentSub(sub);
        },
        onError: (err: any) => {
          console.error('PayPal error:', err);
          toast.error(l('PayPal error', 'Error con PayPal', 'PayPal-Fehler'));
        },
      })
      .render(paypalRef.current);
  }, [window.paypal, isPaid, loading, propertyCount]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-serif font-semibold text-foreground">
            {l('Subscription', 'Suscripción', 'Abonnement')}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Pricing explanation */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-serif font-bold text-foreground">
            ${PRICE_PER_PROPERTY}<span className="text-lg font-normal text-muted-foreground">
              {l('/mo per property', '/mes por propiedad', '/Monat pro Immobilie')}
            </span>
          </h2>
          <p className="text-muted-foreground">
            {l(
              'Pay only for the properties you manage. All features included.',
              'Paga solo por las propiedades que gestionas. Todas las funciones incluidas.',
              'Zahlen Sie nur für verwaltete Immobilien. Alle Funktionen inklusive.'
            )}
          </p>
        </div>

        {/* Current status */}
        <Card className={isPaid ? 'border-primary/50 bg-primary/5' : isTrial ? 'border-accent/50 bg-accent/5' : 'border-border'}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPaid ? 'bg-primary/10' : 'bg-accent/10'}`}>
                {isPaid ? <Crown className="h-6 w-6 text-primary" /> : <Building2 className="h-6 w-6 text-accent" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {isPaid
                    ? l('Active Subscription', 'Suscripción Activa', 'Aktives Abonnement')
                    : isTrial
                      ? l('Free Trial', 'Prueba Gratuita', 'Testversion')
                      : l('No Subscription', 'Sin Suscripción', 'Kein Abonnement')
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {isPaid
                    ? l(
                        `${paidPropertyCount} ${paidPropertyCount === 1 ? 'property' : 'properties'} · $${paidPropertyCount * PRICE_PER_PROPERTY}/mo`,
                        `${paidPropertyCount} ${paidPropertyCount === 1 ? 'propiedad' : 'propiedades'} · $${paidPropertyCount * PRICE_PER_PROPERTY}/mes`,
                        `${paidPropertyCount} ${paidPropertyCount === 1 ? 'Immobilie' : 'Immobilien'} · $${paidPropertyCount * PRICE_PER_PROPERTY}/Monat`
                      )
                    : isTrial
                      ? l(
                          `${trialDaysLeft} days left · 1 property · Max 3 assets`,
                          `${trialDaysLeft} días restantes · 1 propiedad · Máx 3 activos`,
                          `${trialDaysLeft} Tage verbleibend · 1 Immobilie · Max 3 Assets`
                        )
                      : l('Subscribe to get started', 'Suscríbete para comenzar', 'Abonnieren Sie um zu beginnen')
                  }
                </p>
              </div>
              {propertyCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {propertyCount} {l('properties', 'propiedades', 'Immobilien')}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* PayPal for non-paid users */}
        {!isPaid && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {l('Subscribe Now', 'Suscríbete Ahora', 'Jetzt Abonnieren')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {l(
                  `You have ${propertyCount} ${propertyCount === 1 ? 'property' : 'properties'}. Total: $${totalMonthly || PRICE_PER_PROPERTY}/month`,
                  `Tienes ${propertyCount} ${propertyCount === 1 ? 'propiedad' : 'propiedades'}. Total: $${totalMonthly || PRICE_PER_PROPERTY}/mes`,
                  `Sie haben ${propertyCount} ${propertyCount === 1 ? 'Immobilie' : 'Immobilien'}. Gesamt: $${totalMonthly || PRICE_PER_PROPERTY}/Monat`
                )}
              </p>
            </CardHeader>
            <CardContent>
              <div ref={paypalRef} className="min-h-[150px]" />
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {l('Included per property', 'Incluido por propiedad', 'Pro Immobilie inklusive')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">
                    {de ? f.de : es ? f.es : f.en}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          {l(
            'Payments are securely processed via PayPal.',
            'Los pagos se procesan de forma segura a través de PayPal.',
            'Zahlungen werden sicher über PayPal abgewickelt.'
          )}
        </p>
      </main>
    </div>
  );
}
