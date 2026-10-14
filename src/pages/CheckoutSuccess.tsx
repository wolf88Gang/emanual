import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Seo } from '@/components/Seo';
import { HGLogo } from '@/components/HGLogo';

type State = 'checking' | 'paid' | 'pending' | 'failed';

/**
 * Landing page after ONVO redirects the buyer back. The payment is confirmed
 * server-side (the browser is never trusted), retrying a few times because the
 * webhook and the redirect can race.
 */
export default function CheckoutSuccess() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<State>('checking');
  const attempts = useRef(0);

  const l = (en: string, es: string, de: string) =>
    language === 'es' ? es : language === 'de' ? de : en;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const check = async () => {
      attempts.current += 1;
      const sessionId =
        searchParams.get('session_id') ?? searchParams.get('checkoutSessionId') ?? undefined;

      const { data, error } = await supabase.functions.invoke('onvo-verify-checkout', {
        body: sessionId ? { session_id: sessionId } : {},
      });

      if (cancelled) return;

      if (!error && data?.status === 'paid') {
        // Do not refresh auth data here: payment does not change profile/roles,
        // and AuthContext.loading would unmount this page (remount loop).
        setState('paid');
        return;
      }

      // The webhook may have activated the account already: ask our own
      // subscription status before deciding the payment did not land.
      const { data: statusData } = await supabase.functions.invoke('onvo-subscription-status', {
        body: {},
      });
      if (cancelled) return;
      if (statusData?.active) {
        // Do not refresh auth data here: payment does not change profile/roles,
        // and AuthContext.loading would unmount this page (remount loop).
        setState('paid');
        return;
      }

      if (attempts.current >= 5) {
        setState(error || data?.status === 'amount_mismatch' ? 'failed' : 'pending');
        return;
      }
      setTimeout(check, 2500);
    };

    check();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Seo title={l("Payment status — HomeGuide", "Estado del pago — HomeGuide", "Zahlungsstatus — HomeGuide")} description={l("Check payment confirmation before continuing to HomeGuide.", "Consulte la confirmación del pago antes de continuar a HomeGuide.", "Prüfen Sie die Zahlungsbestätigung, bevor Sie mit HomeGuide fortfahren.")} path="/checkout/success" />
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-6 space-y-4">
          <HGLogo size="md" className="mx-auto" />

          {state === 'checking' && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <h1 className="text-xl font-display font-semibold text-foreground">
                {l('Confirming your payment', 'Confirmando su pago', 'Zahlung wird bestätigt')}
              </h1>
              <p className="text-muted-foreground text-sm">
                {l('We are checking the payment status. Please stay on this page; confirmation is not available yet.',
                  'Estamos comprobando el estado del pago. Espere en esta página; aún no hay confirmación.',
                  'Wir prüfen den Zahlungsstatus. Bitte bleiben Sie auf dieser Seite; die Bestätigung steht noch aus.')}
              </p>
            </>
          )}

          {state === 'paid' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
              <h1 className="text-2xl font-display font-semibold text-foreground">
                {l('Payment confirmed', 'Pago confirmado', 'Zahlung bestätigt')}
              </h1>
              <p className="text-muted-foreground">
                {l('Your subscription is confirmed. Continue to HomeGuide to organize your properties and team.',
                  'Su suscripción está confirmada. Continúe a HomeGuide para organizar sus propiedades y su equipo.',
                  'Ihr Abonnement ist bestätigt. Weiter zu HomeGuide, um Ihre Immobilien und Ihr Team zu organisieren.')}
              </p>
              <Button className="w-full" onClick={() => navigate('/')}>
                {l('Continue', 'Continuar', 'Weiter')}
              </Button>
            </>
          )}

          {state === 'pending' && (
            <>
              <Loader2 className="h-10 w-10 text-muted-foreground mx-auto" />
              <h1 className="text-xl font-display font-semibold text-foreground">
                {l('Payment still processing', 'Pago en proceso', 'Zahlung in Bearbeitung')}
              </h1>
              <p className="text-muted-foreground text-sm">
                {l('Confirmation is still pending. Check again in a minute. This does not tell us whether a charge was made; check ONVO and your bank before attempting another payment.',
                  'La confirmación sigue pendiente. Compruebe de nuevo en un minuto. Este estado no permite saber si hubo un cargo; revise ONVO y su banco antes de intentar otro pago.',
                  'Die Bestätigung steht noch aus. Prüfen Sie in einer Minute erneut. Ob eine Belastung erfolgt ist, lässt sich hier nicht feststellen. Prüfen Sie ONVO und Ihre Bank, bevor Sie erneut zahlen.')}
              </p>
              <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                {l('Check again', 'Comprobar de nuevo', 'Erneut prüfen')}
              </Button>
            </>
          )}

          {state === 'failed' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h1 className="text-xl font-display font-semibold text-foreground">
                {l('We could not confirm the payment', 'No pudimos confirmar el pago', 'Zahlung konnte nicht bestätigt werden')}
              </h1>
              <p className="text-muted-foreground text-sm">
                {l('We could not verify the subscription. This does not mean there was no charge. Check ONVO and your bank before attempting another payment.',
                  'No pudimos verificar la suscripción. Esto no significa que no haya habido un cargo. Revise ONVO y su banco antes de intentar otro pago.',
                  'Das Abonnement konnte nicht bestätigt werden. Das bedeutet nicht, dass keine Belastung erfolgt ist. Prüfen Sie ONVO und Ihre Bank, bevor Sie erneut zahlen.')}
              </p>
              <Button className="w-full" onClick={() => navigate('/checkout')}>
                {l('Back to checkout', 'Volver al pago', 'Zurück zur Zahlung')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
