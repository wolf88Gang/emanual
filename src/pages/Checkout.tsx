import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Minus, Plus, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ADDONS, ANNUAL_MONTHS_CHARGED, BASE_PRICE_PER_PROPERTY_USD, quote, type BillingInterval } from '@/lib/pricing';
import { CRC_PER_USD } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Seo } from '@/components/Seo';
import { HGLogo } from '@/components/HGLogo';
import { toast } from 'sonner';
import { landingCopy, publicAddonNames } from '@/components/landing/copy';

type Currency = 'USD' | 'CRC';

export default function Checkout() {
  const { language } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [propertyCount, setPropertyCount] = useState(1);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const l = (en: string, es: string, de: string) =>
    language === 'es' ? es : language === 'de' ? de : en;

  const publicAddonName = (id: string) => publicAddonNames[id]?.[language];

  useEffect(() => {
    if (searchParams.get('canceled') === '1') {
      toast.info(l('You returned from the payment page. If you authorized a payment, check its status before trying again.', 'Regresó de la página de pago. Si autorizó un pago, revise su estado antes de volver a intentarlo.', 'Sie sind von der Zahlungsseite zurückgekehrt. Falls Sie eine Zahlung autorisiert haben, prüfen Sie vor einem neuen Versuch deren Status.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = useMemo(() => quote({ interval, propertyCount, addonIds }), [interval, propertyCount, addonIds]);

  const money = (usd: number) =>
    currency === 'CRC'
      ? `₡${Math.round(usd * CRC_PER_USD).toLocaleString('es-CR')}`
      : `$${usd.toLocaleString('en-US', { minimumFractionDigits: usd % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

  const toggleAddon = (id: string) =>
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const startCheckout = async () => {
    if (!user) {
      navigate('/auth?mode=signup');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('onvo-create-checkout', {
        body: {
          interval,
          currency,
          property_count: propertyCount,
          addons: addonIds,
          origin: window.location.origin,
        },
      });
      if (error || !data?.checkoutUrl) {
        toast.error(
          l('We could not open the payment page. Please try again.',
            'No pudimos abrir la página de pago. Intente de nuevo.',
            'Die Zahlungsseite konnte nicht geöffnet werden. Bitte erneut versuchen.'),
        );
        return;
      }
      window.location.href = data.checkoutUrl as string;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={l('Checkout — HomeGuide', 'Pago — HomeGuide', 'Zahlung — HomeGuide')}
        description={l('Choose the properties you care for and optional features. Pay upfront with ONVO.',
          'Elija las propiedades que atiende y las funciones opcionales. Pague por adelantado con ONVO.',
          'Wählen Sie betreute Immobilien und optionale Funktionen. Bezahlen Sie im Voraus mit ONVO.')}
        path="/checkout"
      />

      <header className="border-b border-border p-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <HGLogo size="sm" />
          <h1 className="text-lg font-display font-semibold text-foreground">
            {l('Set up your subscription', 'Configure su suscripción', 'Abonnement zusammenstellen')}
          </h1>
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-border p-0.5">
            {(['USD', 'CRC'] as Currency[]).map((c) => (
              <Button
                key={c}
                size="sm"
                variant={currency === c ? 'default' : 'ghost'}
                className="h-7 px-2 text-xs"
                onClick={() => setCurrency(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-5 pb-28">
        <p className="text-sm text-muted-foreground">{l("Choose how many client properties your team cares for and the features you need. Review the total before opening ONVO to pay. Access depends on verified payment confirmation.", "Elija cuántas propiedades de clientes atiende su equipo y qué funciones necesita. Revise el total antes de abrir ONVO para pagar. El acceso depende de la confirmación verificada del pago.", "Wählen Sie die betreuten Kundenimmobilien und benötigten Funktionen. Prüfen Sie den Gesamtbetrag, bevor Sie ONVO zur Zahlung öffnen. Der Zugang hängt von der bestätigten Zahlung ab.")}</p>
        {/* Billing interval */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{l('Billing', 'Facturación', 'Abrechnung')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setInterval('monthly')}
                className={`rounded-xl border p-4 text-left transition ${interval === 'monthly' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
              >
                <p className="font-semibold text-foreground">{l('Monthly', 'Mensual', 'Monatlich')}</p>
                <p className="text-sm text-muted-foreground">
                  {money(BASE_PRICE_PER_PROPERTY_USD)} {l('per property / month', 'por propiedad / mes', 'pro Immobilie / Monat')}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setInterval('annual')}
                className={`relative rounded-xl border p-4 text-left transition ${interval === 'annual' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
              >
                <Badge className="absolute -top-2 right-3 text-[10px]">
                  {l('Annual saving', 'Ahorro anual', 'Jährliche Ersparnis')}
                </Badge>
                <p className="font-semibold text-foreground">{l('Annual', 'Anual', 'Jährlich')}</p>
                <p className="text-sm text-muted-foreground">
                  {l(`Pay ${ANNUAL_MONTHS_CHARGED} months, use 12`,
                    `Pague ${ANNUAL_MONTHS_CHARGED} meses, use 12`,
                    `${ANNUAL_MONTHS_CHARGED} Monate zahlen, 12 nutzen`)}
                </p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Properties */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{l('Properties', 'Propiedades', 'Immobilien')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground max-w-xs">
              {l('A property is a real place your team cares for: a house, villa, condominium or other client site. How many will you include?',
                'Una propiedad es un lugar real que atiende su equipo: una casa, villa, condominio u otro sitio de un cliente. ¿Cuántas incluirá?',
                'Eine Immobilie ist ein betreuter Ort: ein Haus, eine Villa, eine Wohnanlage oder ein anderer Kundenstandort. Wie viele möchten Sie einbeziehen?')}
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setPropertyCount((n) => Math.max(1, n - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center text-xl font-semibold text-foreground">{propertyCount}</span>
              <Button variant="outline" size="icon" onClick={() => setPropertyCount((n) => Math.min(500, n + 1))}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Add-ons */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{l('Optional features', 'Funciones opcionales', 'Optionale Funktionen')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {l('Choose only what your team needs. Each optional feature is priced per account, not per property or person.',
                'Elija solo lo que necesita su equipo. Cada función opcional se cobra por cuenta, no por propiedad ni por persona.',
                'Wählen Sie nur, was Ihr Team braucht. Jede optionale Funktion wird pro Konto berechnet, nicht pro Immobilie oder Person.')}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {ADDONS.map((addon) => {
              const on = addonIds.includes(addon.id);
              const name = publicAddonName(addon.id) ?? addon.name[language];
              const desc = landingCopy[language].pricing[`addon_${addon.id}`];
              return (
                <div key={addon.id} className={`flex items-start gap-3 rounded-xl border p-3 ${on ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{name}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                      {money(addon.monthlyUsd)}<span className="text-xs font-normal text-muted-foreground">{l('/mo', '/mes', '/Mon.')}</span>
                    </p>
                    <Switch className="mt-2" checked={on} onCheckedChange={() => toggleAddon(addon.id)} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="border-primary/40">
          <CardContent className="p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {propertyCount} × {l('property', 'propiedad', 'Immobilie')}
              </span>
              <span className="text-foreground">{money(propertyCount * BASE_PRICE_PER_PROPERTY_USD)}{l('/mo', '/mes', '/Mon.')}</span>
            </div>
            {addonIds.map((id) => {
              const addon = ADDONS.find((a) => a.id === id);
              if (!addon) return null;
              const name = publicAddonName(addon.id) ?? addon.name[language];
              return (
                <div key={id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="text-foreground">{money(addon.monthlyUsd)}{l('/mo', '/mes', '/Mon.')}</span>
                </div>
              );
            })}
            <div className="border-t border-border pt-3 flex items-end justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {interval === 'annual'
                    ? l('Total paid upfront for 12 months', 'Total por adelantado para 12 meses', 'Gesamtbetrag im Voraus für 12 Monate')
                    : l('Total paid upfront for 1 month', 'Total por adelantado para 1 mes', 'Gesamtbetrag im Voraus für 1 Monat')}
                </p>
                {interval === 'annual' && (
                  <p className="text-sm text-primary font-medium">
                    {l('You save', 'Ahorra', 'Sie sparen')} {money(q.savingUsd)}
                  </p>
                )}
              </div>
              <p className="text-3xl font-display font-bold text-foreground">{money(q.totalUsd)}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {l('Payment processed by ONVO Pay. Cards in USD or colones.',
            'Pago procesado por ONVO Pay. Tarjetas en dólares o colones.',
            'Zahlung über ONVO Pay. Karten in USD oder Colones.')}
        </div>

        {!user && (
          <p className="text-sm text-muted-foreground">
            {l('Continue to create your account first. You will return to choose your subscription before paying.',
              'Primero continuará para crear su cuenta. Después elegirá su suscripción antes de pagar.',
              'Erstellen Sie zunächst Ihr Konto. Anschließend wählen Sie Ihr Abonnement vor der Zahlung.')}
          </p>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button className="flex-1 h-12 text-base" onClick={startCheckout} disabled={submitting}>
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            {!user ? l("Create account to continue", "Crear cuenta para continuar", "Konto erstellen und fortfahren") : l(`Pay ${money(q.totalUsd)} with ONVO`, `Pagar ${money(q.totalUsd)} con ONVO`, `${money(q.totalUsd)} mit ONVO zahlen`)}
          </Button>
          {user && (
            <Button variant="ghost" onClick={() => signOut()}>
              {l('Sign out', 'Cerrar sesión', 'Abmelden')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
