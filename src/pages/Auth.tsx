import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  const { t, language } = useLanguage();
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const es = language === 'es';

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    try {
      if (isForgot) {
        await supabase.auth.resetPasswordForEmail(data.email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        // Neutral response: never reveal whether the email exists.
        toast.success(
          es
            ? 'Si existe una cuenta con ese correo, le enviamos un enlace para restablecer la contraseña.'
            : 'If an account exists for that email, we sent a password reset link.',
        );
        setIsForgot(false);
        reset();
        return;
      }
      if (!data.password || data.password.length < 6) {
        toast.error(es ? 'La contraseña debe tener al menos 6 caracteres.' : 'Password must be at least 6 characters.');
        return;
      }
      if (isSignUp) {
        const { error } = await signUp(data.email, data.password, data.fullName);
        if (error) {
          toast.error(error.message.includes('already registered') ? 'This email is already registered. Please sign in instead.' : error.message);
        } else {
          toast.success('Account created! Please check your email to confirm.');
          setIsSignUp(false);
          reset();
        }
      } else {
        const { error } = await signIn(data.email, data.password);
        if (error) {
          toast.error(error.message.includes('Invalid login') ? 'Invalid email or password.' : error.message);
        } else {
          toast.success('Welcome back!');
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
        title={isSignUp ? (es ? 'Crear cuenta — Home Guide' : 'Create account — Home Guide') : (es ? 'Iniciar sesión — Home Guide' : 'Sign in — Home Guide')}
        description={es ? 'Accede a Home Guide para gestionar tu propiedad, paisajismo y cuadrillas.' : 'Sign in to Home Guide to manage your estate, landscape and crews.'}
        path="/auth"
      />
      {/* Left side — background image */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        <img
          src="/images/estate_guide_2.jpg"
          alt="Luxury estate at night"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16 text-white">
          <div className="flex items-center gap-3 mb-6">
            <img src="/images/hg-logo.png" alt="Home Guide" className="w-12 h-12 object-contain" />
            <span className="text-3xl font-display font-semibold tracking-tight">Home Guide</span>
          </div>
          <p className="text-xl font-light text-white max-w-lg leading-relaxed">
            {es
              ? 'Gestiona propiedades, paisajes y activos vivos — todo en un solo lugar.'
              : 'Manage properties, landscapes, and living assets — all in one place.'}
          </p>
          <Link
            to="/"
            className="mt-6 text-sm text-white/90 hover:text-white transition-colors underline underline-offset-4"
          >
            {es ? 'Ver todas las funciones →' : 'See all features →'}
          </Link>
        </div>
      </div>

      {/* Mobile hero banner */}
      <div className="lg:hidden relative h-48 overflow-hidden">
        <img
          src="/images/estate_guide_2.jpg"
          alt="Luxury estate at night"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/70" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-6">
          <div className="flex items-center gap-2 mb-2">
            <img src="/images/hg-logo.png" alt="Home Guide" className="w-9 h-9 object-contain" />
            <span className="text-2xl font-display font-semibold">Home Guide</span>
          </div>
          <p className="text-sm text-white/95">
            {es ? 'Gestión digital de propiedades y paisajes' : 'Digital property & landscape management'}
          </p>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex flex-col bg-background">
        <header className="p-4 flex justify-between items-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            ← {t('nav.home')}
          </Link>
          <LanguagePicker variant="full" />
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-display font-bold text-foreground">
                {isForgot
                  ? (es ? 'Restablecer contraseña' : 'Reset password')
                  : isSignUp ? t('auth.signUp') : t('auth.signIn')}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isForgot
                  ? (es ? 'Le enviaremos un enlace a su correo' : "We'll email you a reset link")
                  : isSignUp
                  ? (es ? 'Crea tu cuenta para gestionar tu propiedad' : 'Create your account to manage your estate')
                  : (es ? 'Bienvenido de nuevo' : 'Welcome back')}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {isSignUp && !isForgot && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">{es ? 'Nombre completo' : 'Full Name'}</Label>
                  <Input id="fullName" placeholder={es ? 'Juan García' : 'John Smith'} {...register('fullName')} />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {!isForgot && (
              <div className="space-y-1.5">
                <Label htmlFor="password">{t('auth.password')}</Label>
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
                  {es ? '¿Olvidó su contraseña?' : 'Forgot your password?'}
                </button>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <span className="animate-pulse">{es ? 'Cargando...' : 'Loading...'}</span>
                ) : (
                  <>
                    {isForgot
                      ? (es ? 'Enviar enlace' : 'Send reset link')
                      : isSignUp ? t('auth.signUp') : t('auth.signIn')}
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
                  {es ? '← Volver a iniciar sesión' : '← Back to sign in'}
                </button>
              </p>
            ) : (
            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? t('auth.hasAccount') : t('auth.noAccount')}{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); reset(); }}
                className="text-primary font-medium hover:underline"
              >
                {isSignUp ? t('auth.signIn') : t('auth.signUp')}
              </button>
            </p>
            )}

            <p className="text-center text-[11px] text-muted-foreground mt-8">
              {es
                ? 'Home Guide gestiona activos vivos, intención de diseño y riesgo a largo plazo.'
                : 'Home Guide manages living assets, design intent, and long-term risk.'}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
