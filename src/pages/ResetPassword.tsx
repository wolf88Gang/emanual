import React, { useEffect, useRef, useState } from 'react';
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
 * Landing page for the Supabase recovery link.
 *
 * A plain authenticated session is NOT sufficient: the password form only
 * unlocks when this navigation carries a real recovery signal — the
 * PASSWORD_RECOVERY auth event, or a recovery type in the URL
 * (hash fragment `type=recovery` / `?code=` PKCE recovery link).
 */
export default function ResetPassword() {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const tr = (en: string, es: string, de: string) =>
    language === 'es' ? es : language === 'de' ? de : en;

  const [ready, setReady] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hash = window.location.hash ?? '';
    const search = window.location.search ?? '';
    const urlLooksLikeRecovery =
      hash.includes('type=recovery') ||
      new URLSearchParams(search).get('type') === 'recovery' ||
      new URLSearchParams(search).has('code');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (urlLooksLikeRecovery && session)) {
        setIsRecovery(true);
        setReady(true);
        if (timer.current) clearTimeout(timer.current);
      }
    });

    // Give the SDK a moment to process the recovery link before deciding.
    timer.current = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsRecovery(urlLooksLikeRecovery && !!session);
      setReady(true);
    }, urlLooksLikeRecovery ? 1200 : 0);

    return () => {
      subscription.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(tr('Use at least 8 characters.', 'Use al menos 8 caracteres.', 'Verwenden Sie mindestens 8 Zeichen.'));
      return;
    }
    if (password !== confirm) {
      toast.error(tr('Passwords do not match.', 'Las contraseñas no coinciden.', 'Die Passwörter stimmen nicht überein.'));
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(tr('Password updated.', 'Contraseña actualizada.', 'Passwort aktualisiert.'));
      // Never keep the recovery session authenticated.
      await supabase.auth.signOut();
      navigate('/auth?password_reset=success', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Seo
        title={tr('New password — Home Guide', 'Nueva contraseña — Home Guide', 'Neues Passwort — Home Guide')}
        description={tr(
          'Set a new password for your Home Guide account.',
          'Defina una nueva contraseña para su cuenta de Home Guide.',
          'Legen Sie ein neues Passwort für Ihr Home Guide-Konto fest.',
        )}
        path="/auth/reset-password"
      />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{tr('New password', 'Nueva contraseña', 'Neues Passwort')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : !isRecovery ? (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                {tr(
                  'This recovery link is invalid or has expired. Request a new one from the sign-in page.',
                  'El enlace de recuperación no es válido o ya expiró. Solicite uno nuevo desde el inicio de sesión.',
                  'Dieser Wiederherstellungslink ist ungültig oder abgelaufen. Fordern Sie über die Anmeldeseite einen neuen an.',
                )}
              </p>
              <Button asChild className="w-full">
                <Link to="/auth">{tr('Go to sign in', 'Ir a iniciar sesión', 'Zur Anmeldung')}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">{tr('New password', 'Nueva contraseña', 'Neues Passwort')}</Label>
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
                    aria-label={tr('Show password', 'Mostrar contraseña', 'Passwort anzeigen')}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">
                  {tr('Confirm password', 'Confirmar contraseña', 'Passwort bestätigen')}
                </Label>
                <Input
                  id="confirm-password"
                  type={show ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : tr('Save password', 'Guardar contraseña', 'Passwort speichern')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
