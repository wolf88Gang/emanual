import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Leaf, ArrowRight, Users, Shield, Wrench, Building } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  { 
    email: 'owner@demo.com', 
    role: 'Owner',
    icon: Building,
    description: 'Full access to all features',
    descriptionEs: 'Acceso completo a todas las funciones'
  },
  { 
    email: 'manager@demo.com', 
    role: 'Manager',
    icon: Shield,
    description: 'Manage assets, tasks & team',
    descriptionEs: 'Gestionar activos, tareas y equipo'
  },
  { 
    email: 'crew@demo.com', 
    role: 'Crew',
    icon: Wrench,
    description: 'Complete tasks & check-ins',
    descriptionEs: 'Completar tareas y registros'
  },
  { 
    email: 'vendor@demo.com', 
    role: 'Vendor',
    icon: Users,
    description: 'View assigned tasks only',
    descriptionEs: 'Ver solo tareas asignadas'
  },
];

export default function Auth() {
  const { t, language, toggleLanguage } = useLanguage();
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoAccess, setShowDemoAccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    
    try {
      if (isSignUp) {
        const { error } = await signUp(data.email, data.password, data.fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in instead.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Account created! Please check your email to confirm.');
          setIsSignUp(false);
          reset();
        }
      } else {
        const { error } = await signIn(data.email, data.password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            toast.error('Invalid email or password. Please try again.');
          } else {
            toast.error(error.message);
          }
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
        // If login fails, try to create the account first
        toast.error(`Demo account not set up. Please contact support.`);
      } else {
        toast.success('Welcome to Casa Guide!');
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const tagline = language === 'es' 
    ? 'Gestiona propiedades, paisajes y activos vivos — todo en un solo lugar.'
    : 'Manage properties, landscapes, and living assets — all in one place.';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-serif font-semibold text-primary">
            Casa Guide
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={toggleLanguage}>
          {language === 'en' ? '🇪🇸 Español' : '🇺🇸 English'}
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Tagline */}
          <p className="text-center text-muted-foreground mb-6 text-sm">
            {tagline}
          </p>

          {showDemoAccess ? (
            /* Demo Access Panel */
            <Card className="estate-card border-0 shadow-xl">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-serif">
                  {language === 'es' ? 'Acceso Demo' : 'Demo Access'}
                </CardTitle>
                <CardDescription>
                  {language === 'es' 
                    ? 'Selecciona un perfil para explorar Casa Guide'
                    : 'Select a profile to explore Casa Guide'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    onClick={() => handleDemoLogin(account.email)}
                    disabled={isLoading}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <account.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{account.role}</div>
                      <div className="text-sm text-muted-foreground">
                        {language === 'es' ? account.descriptionEs : account.description}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}

                <div className="pt-4 border-t border-border mt-4">
                  <button
                    onClick={() => setShowDemoAccess(false)}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {language === 'es' ? '← Volver a inicio de sesión' : '← Back to sign in'}
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Login/Signup Form */
            <Card className="estate-card border-0 shadow-xl">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-serif">
                  {isSignUp ? t('auth.signUp') : t('auth.signIn')}
                </CardTitle>
                <CardDescription>
                  {isSignUp 
                    ? (language === 'es' ? 'Crea tu cuenta para gestionar tu propiedad' : 'Create your account to manage your estate')
                    : (language === 'es' ? 'Bienvenido de nuevo a tu sistema de gestión' : 'Welcome back to your estate management platform')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName">
                        {language === 'es' ? 'Nombre completo' : 'Full Name'}
                      </Label>
                      <Input
                        id="fullName"
                        placeholder={language === 'es' ? 'Juan García' : 'John Smith'}
                        {...register('fullName')}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">{t('auth.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      {...register('email')}
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
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
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="animate-pulse">
                        {language === 'es' ? 'Cargando...' : 'Loading...'}
                      </span>
                    ) : (
                      <>
                        {isSignUp ? t('auth.signUp') : t('auth.signIn')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {isSignUp ? t('auth.hasAccount') : t('auth.noAccount')}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        reset();
                      }}
                      className="text-primary font-medium hover:underline"
                    >
                      {isSignUp ? t('auth.signIn') : t('auth.signUp')}
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Demo Access Button */}
          {!showDemoAccess && (
            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => setShowDemoAccess(true)}
              >
                <Users className="mr-2 h-5 w-5" />
                {language === 'es' ? 'Acceso Demo (Sin Contraseña)' : 'Demo Access (No Password)'}
              </Button>
            </div>
          )}

          {/* Value Proposition */}
          <div className="mt-6 p-4 rounded-xl bg-secondary/50 text-center">
            <p className="text-xs text-muted-foreground">
              {language === 'es' 
                ? 'Casa Guide gestiona activos vivos, intención de diseño y riesgo a largo plazo — no tareas genéricas.'
                : 'Casa Guide manages living assets, design intent, and long-term risk — not generic tasks.'}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-muted-foreground">
        <p>Casa Guide — Digital Property & Landscape Management</p>
      </footer>
    </div>
  );
}
