import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Leaf, ArrowRight, Users, Shield, Wrench, Building } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

interface DemoAccount {
  email: string;
  role: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  descriptionEs: string;
}

const demoAccounts: DemoAccount[] = [
  { email: 'owner@demo.com', role: 'Owner', icon: Building, description: 'Full access to all features', descriptionEs: 'Acceso completo a todas las funciones' },
  { email: 'manager@demo.com', role: 'Manager', icon: Shield, description: 'Manage assets, tasks & team', descriptionEs: 'Gestionar activos, tareas y equipo' },
  { email: 'crew@demo.com', role: 'Crew', icon: Wrench, description: 'Complete tasks & check-ins', descriptionEs: 'Completar tareas y registros' },
  { email: 'vendor@demo.com', role: 'Vendor', icon: Users, description: 'View assigned tasks only', descriptionEs: 'Ver solo tareas asignadas' },
];

export default function Auth() {
  const { t, language, toggleLanguage } = useLanguage();
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoAccess, setShowDemoAccess] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    try {
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
          navigate('/');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(email, 'Demo1234!');
      if (error) {
        toast.error('Demo account not set up. Please contact support.');
      } else {
        toast.success('Welcome to Home Guide!');
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const es = language === 'es';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
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
            <img src="/images/hg-logo.png" alt="HG" className="w-12 h-12 object-contain invert brightness-200" />
            <span className="text-3xl font-serif font-semibold tracking-tight">Home Guide</span>
          </div>
          <p className="text-xl font-light text-white/90 max-w-lg leading-relaxed">
            {es
              ? 'Gestiona propiedades, paisajes y activos vivos — todo en un solo lugar.'
              : 'Manage properties, landscapes, and living assets — all in one place.'}
          </p>
          <Link
            to="/features"
            className="mt-6 text-sm text-white/70 hover:text-white transition-colors underline underline-offset-4"
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
            <img src="/images/hg-logo.png" alt="HG" className="w-9 h-9 object-contain invert brightness-200" />
            <span className="text-2xl font-serif font-semibold">Home Guide</span>
          </div>
          <p className="text-sm text-white/80">
            {es ? 'Gestión digital de propiedades y paisajes' : 'Digital property & landscape management'}
          </p>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex flex-col bg-background">
        <header className="p-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={toggleLanguage}>
            {language === 'en' ? '🇪🇸 Español' : '🇺🇸 English'}
          </Button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            {showDemoAccess ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h1 className="text-2xl font-serif font-bold text-foreground">
                    {es ? 'Acceso Demo' : 'Demo Access'}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {es ? 'Selecciona un perfil para explorar' : 'Select a profile to explore'}
                  </p>
                </div>

                <div className="space-y-2">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.email}
                      onClick={() => handleDemoLogin(account.email)}
                      disabled={isLoading}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent/50 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <account.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground">{account.role}</div>
                        <div className="text-xs text-muted-foreground">{es ? account.descriptionEs : account.description}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowDemoAccess(false)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {es ? '← Volver' : '← Back to sign in'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <h1 className="text-2xl font-serif font-bold text-foreground">
                    {isSignUp ? t('auth.signUp') : t('auth.signIn')}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isSignUp
                      ? (es ? 'Crea tu cuenta para gestionar tu propiedad' : 'Create your account to manage your estate')
                      : (es ? 'Bienvenido de nuevo' : 'Welcome back')}
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {isSignUp && (
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

                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? (
                      <span className="animate-pulse">{es ? 'Cargando...' : 'Loading...'}</span>
                    ) : (
                      <>
                        {isSignUp ? t('auth.signUp') : t('auth.signIn')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

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

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs"><span className="px-2 bg-background text-muted-foreground">{es ? 'o' : 'or'}</span></div>
                </div>

                <Button variant="outline" className="w-full" onClick={() => setShowDemoAccess(true)}>
                  <Users className="mr-2 h-4 w-4" />
                  {es ? 'Acceso Demo' : 'Demo Access'}
                </Button>
              </div>
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
