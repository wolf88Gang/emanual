import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Seo } from '@/components/Seo';

/**
 * Landing page for the Supabase recovery link. The recovery session is
 * established by the SDK from the URL fragment, so we only need to wait for it
 * and then let the user set a new password.
 */
export default function ResetPassword() {
  const { language } = useLanguage();
  const es = language === 'es';
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setHasSession(true);
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(es ? 'Use al menos 8 caracteres.' : 'Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      toast.error(es ? 'Las contraseñas no coinciden.' : 'Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(es ? 'Contraseña actualizada.' : 'Password updated.');
      navigate('/', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Seo
        title={es ? 'Nueva contraseña — Home Guide' : 'New password — Home Guide'}
        description={es ? 'Defina una nueva contraseña para su cuenta de Home Guide.' : 'Set a new password for your Home Guide account.'}
        path="/auth/reset-password"
      />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{es ? 'Nueva contraseña' : 'New password'}</CardTitle>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : !hasSession ? (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                {es
                  ? 'El enlace de recuperación no es válido o ya expiró. Solicite uno nuevo desde el inicio de sesión.'
                  : 'This recovery link is invalid or has expired. Request a new one from the sign-in page.'}
              </p>
              <Button asChild className="w-full"><Link to="/auth">{es ? 'Ir a iniciar sesión' : 'Go to sign in'}</Link></Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">{es ? 'Nueva contraseña' : 'New password'}</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={es ? 'Mostrar contraseña' : 'Show password'}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">{es ? 'Confirmar contraseña' : 'Confirm password'}</Label>
                <Input
                  id="confirm-password"
                  type={show ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (es ? 'Guardar contraseña' : 'Save password')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
