import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HGLogo } from '@/components/HGLogo';

type State = 'checking' | 'paid' | 'pending' | 'failed';

/**
 * Landing page after ONVO redirects the buyer back. The payment is confirmed
 * server-side (the browser is never trusted), retrying a few times because the
 * webhook and the redirect can race.
 */
export default function CheckoutSuccess() {
  const { language } = useLanguage();
  const { user, refreshUserData } = useAuth();
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
        await refreshUserData();
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
        await refreshUserData();
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
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-6 space-y-4">
          <HGLogo size="md" className="mx-auto" />

          {state === 'checking' && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <h1 className="text-xl font-display font-semibold text-foreground">
                {l('Confirming your payment', 'Confirmando tu pago', 'Zahlung wird bestätigt')}
              </h1>
              <p className="text-muted-foreground text-sm">
                {l('This takes a few seconds. Please do not close this page.',
                  'Esto toma unos segundos. No cierres esta página.',
                  'Das dauert einige Sekunden. Bitte diese Seite nicht schließen.')}
              </p>
            </>
          )}

          {state === 'paid' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
              <h1 className="text-2xl font-display font-semibold text-foreground">
                {l('Payment received', 'Pago recibido', 'Zahlung erhalten')}
              </h1>
              <p className="text-muted-foreground">
                {l('Your account is active. Let us set up your first property.',
                  'Tu cuenta está activa. Vamos a configurar tu primera propiedad.',
                  'Ihr Konto ist aktiv. Richten wir Ihre erste Immobilie ein.')}
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
                {l('We have not received the confirmation yet. Reload this page in a minute; if it does not clear, write to us.',
                  'Todavía no recibimos la confirmación. Recarga esta página en un minuto; si no se resuelve, escríbenos.',
                  'Wir haben noch keine Bestätigung erhalten. Laden Sie die Seite in einer Minute neu; andernfalls schreiben Sie uns.')}
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
                {l('Nothing was activated. You can try the payment again.',
                  'No se activó nada. Puedes intentar el pago de nuevo.',
                  'Es wurde nichts aktiviert. Sie können die Zahlung erneut versuchen.')}
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
