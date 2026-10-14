import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguagePicker } from '@/components/LanguagePicker';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Seo } from '@/components/Seo';
import { supabase } from '@/integrations/supabase/client';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().optional(),
  fullName: z.string().optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function Auth() {
  const { language } = useLanguage();
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  // Anyone can open an account; the paywall decides who gets in. Sign-up is
  // driven by ?mode=signup so the checkout flow can link straight to it.
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordResetDone, setPasswordResetDone] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  // Deep link from the pricing / checkout flow: /auth?mode=signup
  useEffect(() => {
    if (searchParams.get('mode') === 'signup') setIsSignUp(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time notice after a completed password reset (recovery session signed out).
  useEffect(() => {
    if (searchParams.get('password_reset') !== 'success') return;
    toast.success(
      language === 'es'
        ? 'Contraseña actualizada. Inicie sesión de nuevo.'
        : language === 'de'
        ? 'Passwort aktualisiert. Bitte melden Sie sich erneut an.'
        : 'Password updated. Please sign in again.',
    );
    setPasswordResetDone(true);
    const next = new URLSearchParams(searchParams);
    next.delete('password_reset');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    const tr = (en: string, esText: string, de: string) =>
    language === 'es' ? esText : language === 'de' ? de : en;

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    try {
      if (isForgot) {
        await supabase.auth.resetPasswordForEmail(data.email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        // Neutral response: never reveal whether the email exists.
        toast.success(
          tr(
            'If an account exists for that email, we sent a password reset link.',
            'Si existe una cuenta con ese correo, le enviamos un enlace para restablecer la contraseña.',
            'Falls ein Konto mit dieser E-Mail existiert, haben wir einen Link zum Zurücksetzen gesendet.',
          ),
        );
        setIsForgot(false);
        reset();
        return;
      }
      if (!data.password || data.password.length < 6) {
        toast.error(tr('Password must be at least 6 characters.', 'La contraseña debe tener al menos 6 caracteres.', 'Das Passwort muss mindestens 6 Zeichen haben.'));
        return;
      }
      if (isSignUp) {
        const { error } = await signUp(data.email, data.password, data.fullName);
        if (error) {
          toast.error(
            error.message.toLowerCase().includes('already registered')
              ? tr('That email already has an account. Sign in instead.', 'Ese correo ya tiene una cuenta. Inicie sesión.', 'Diese E-Mail hat bereits ein Konto. Bitte anmelden.')
              : tr('We could not create your account. Please check your details and try again.', 'No pudimos crear su cuenta. Revise sus datos e intente de nuevo.', 'Ihr Konto konnte nicht erstellt werden. Prüfen Sie Ihre Angaben und versuchen Sie es erneut.'),
          );
          return;
        }
        toast.success(
          tr('Account created. Choose your properties and features to continue to payment.', 'Cuenta creada. Elija las propiedades y funciones que necesita para continuar al pago.', 'Konto erstellt. Wählen Sie Immobilien und Funktionen für die Zahlung.'),
        );
        // Paid-first: new accounts go straight to checkout.
        navigate('/checkout');
        return;
      }

      {
        const { error } = await signIn(data.email, data.password);
        if (error) {
          toast.error(error.message.includes('Invalid login') ? tr('Check your email and password.', 'Revise su correo y contraseña.', 'Prüfen Sie Ihre E-Mail-Adresse und Ihr Passwort.') : tr('We could not sign you in. Please try again.', 'No pudimos iniciar su sesión. Intente de nuevo.', 'Die Anmeldung war nicht möglich. Bitte versuchen Sie es erneut.'));
        } else {
          toast.success(tr('You are signed in.', 'Sesión iniciada.', 'Sie sind angemeldet.'));
          // Routing is centralized: RootRoute / AppRoutes decide the destination
          // once profile, org type and roles have loaded.
          navigate('/');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Seo
        title={isForgot ? tr('Reset password — HomeGuide', 'Restablecer contraseña — HomeGuide', 'Passwort zurücksetzen — HomeGuide') : isSignUp ? tr('Create account — HomeGuide', 'Crear cuenta — HomeGuide', 'Konto erstellen — HomeGuide') : tr('Sign in — HomeGuide', 'Iniciar sesión — HomeGuide', 'Anmelden — HomeGuide')}
        description={tr('Access your clients’ instructions, property tasks and work history in HomeGuide.', 'Acceda a las instrucciones de sus clientes, las tareas y el historial de cada propiedad en HomeGuide.', 'Greifen Sie in HomeGuide auf Kundenanweisungen, Aufgaben und bisherige Arbeiten jeder Immobilie zu.')}
        path="/auth"
      />
      {/* Left side — background image */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        <img
          src="/images/estate_guide_2.jpg"
          alt={tr("Property and garden", "Propiedad y jardín", "Immobilie und Garten")}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16 text-white">
          <div className="flex items-center gap-3 mb-6">
            <img src="/images/hg-logo.png" alt="HomeGuide" className="w-12 h-12 object-contain" />
            <span className="text-3xl font-display font-semibold tracking-tight">HomeGuide</span>
          </div>
          <p className="text-xl font-light text-white max-w-lg leading-relaxed">
            {tr('Know what each client needs, what work is due and what your team has already done.', 'Sepa qué necesita cada cliente, qué trabajo toca hacer y qué hizo su equipo.', 'Sehen Sie, was jeder Kunde braucht, welche Arbeiten anstehen und was Ihr Team erledigt hat.')}
          </p>
          <Link
            to="/"
            className="mt-6 text-sm text-white/90 hover:text-white transition-colors underline underline-offset-4"
          >
            {tr('How HomeGuide works →', 'Cómo funciona HomeGuide →', 'So funktioniert HomeGuide →')}
          </Link>
        </div>
      </div>

      {/* Mobile hero banner */}
      <div className="lg:hidden relative h-48 overflow-hidden">
        <img
          src="/images/estate_guide_2.jpg"
          alt={tr("Property and garden", "Propiedad y jardín", "Immobilie und Garten")}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/70" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-6">
          <div className="flex items-center gap-2 mb-2">
            <img src="/images/hg-logo.png" alt="HomeGuide" className="w-9 h-9 object-contain" />
            <span className="text-2xl font-display font-semibold">HomeGuide</span>
          </div>
          <p className="text-sm text-white/95">
            {tr('Instructions, work and history for each property', 'Instrucciones, trabajo e historial por propiedad', 'Anweisungen, Arbeit und Verlauf pro Immobilie')}
          </p>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex flex-col bg-background">
        <header className="p-4 flex justify-between items-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            ← {tr('Home', 'Inicio', 'Startseite')}
          </Link>
          <LanguagePicker variant="full" />
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-display font-bold text-foreground">
                {isForgot
                  ? tr('Reset password', 'Restablecer contraseña', 'Passwort zurücksetzen')
                  : isSignUp ? tr('Create account', 'Crear cuenta', 'Konto erstellen') : tr('Sign in', 'Iniciar sesión', 'Anmelden')}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isForgot
                  ? tr("We'll email you a reset link", 'Le enviaremos un enlace a su correo', 'Wir senden Ihnen einen Link per E-Mail')
                  : isSignUp
                  ? tr('Create an account, then choose your properties and optional features. Payment is required before using the service.', 'Cree una cuenta y luego elija sus propiedades y funciones opcionales. El servicio se paga por adelantado.', 'Erstellen Sie ein Konto und wählen Sie anschließend Immobilien und optionale Funktionen. Der Dienst wird im Voraus bezahlt.')
                  : tr('Open your properties to see instructions, pending work and past visits.', 'Abra sus propiedades para consultar instrucciones, trabajo pendiente y visitas anteriores.', 'Öffnen Sie Ihre Immobilien für Anweisungen, offene Arbeiten und frühere Besuche.')}
              </p>
            </div>

            {passwordResetDone && (
              <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
                {tr(
                  'Password updated. Please sign in again.',
                  'Contraseña actualizada. Inicie sesión de nuevo.',
                  'Passwort aktualisiert. Bitte melden Sie sich erneut an.',
                )}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {isSignUp && !isForgot && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">{tr('Full Name', 'Nombre completo', 'Vollständiger Name')}</Label>
                  <Input id="fullName" placeholder={tr('Your full name', 'Su nombre completo', 'Ihr vollständiger Name')} {...register('fullName')} />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">{tr('Email', 'Correo electrónico', 'E-Mail-Adresse')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={tr("name@company.com", "nombre@empresa.com", "name@firma.de")}
                  {...register('email')}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-xs text-destructive">{tr('Enter a valid email address.', 'Ingrese un correo electrónico válido.', 'Geben Sie eine gültige E-Mail-Adresse ein.')}</p>}
              </div>

              {!isForgot && (
              <div className="space-y-1.5">
                <Label htmlFor="password">{tr('Password', 'Contraseña', 'Passwort')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              )}

              {!isForgot && !isSignUp && (
                <button
                  type="button"
                  onClick={() => { setIsForgot(true); reset(); }}
                  className="text-xs text-primary hover:underline"
                >
                  {tr('Forgot your password?', '¿Olvidó su contraseña?', 'Passwort vergessen?')}
                </button>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <span className="animate-pulse">{tr('Loading...', 'Cargando...', 'Wird geladen...')}</span>
                ) : (
                  <>
                    {isForgot
                      ? tr('Send reset link', 'Enviar enlace', 'Link senden')
                      : isSignUp ? tr('Create account', 'Crear cuenta', 'Konto erstellen') : tr('Sign in', 'Iniciar sesión', 'Anmelden')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {isForgot ? (
              <p className="text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => { setIsForgot(false); reset(); }}
                  className="text-primary font-medium hover:underline"
                >
                  {tr('← Back to sign in', '← Volver a iniciar sesión', '← Zurück zur Anmeldung')}
                </button>
              </p>
            ) : (
            <div className="space-y-2">
              <p className="text-center text-sm text-muted-foreground">
                {isSignUp
                  ? tr('Already have an account?', '¿Ya tiene cuenta?', 'Haben Sie schon ein Konto?')
                  : tr('No account yet?', '¿Aún no tiene cuenta?', 'Noch kein Konto?')}{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); reset(); }}
                  className="text-primary font-medium hover:underline"
                >
                  {isSignUp
                    ? tr('Sign in', 'Iniciar sesión', 'Anmelden')
                    : tr('Create an account', 'Crear una cuenta', 'Konto erstellen')}
                </button>
              </p>
              <p className="text-center text-xs text-muted-foreground">
                <Link to="/request-access" className="hover:underline">
                  {tr('Would you rather request access? Tell us about your team', '¿Prefiere solicitar acceso? Cuéntenos sobre su equipo', 'Möchten Sie lieber Zugang anfragen? Erzählen Sie uns von Ihrem Team')}
                </Link>
              </p>
            </div>
            )}

            <p className="text-center text-xs text-muted-foreground mt-8">
              {tr(
                'Keep client instructions and work history together, even when the team changes.',
                'Las instrucciones y el historial de cada propiedad permanecen juntos, aunque cambie el equipo.',
                'Kundenanweisungen und bisherige Arbeiten bleiben zusammen, auch wenn das Team wechselt.',
              )}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
