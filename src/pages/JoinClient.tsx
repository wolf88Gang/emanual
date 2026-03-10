import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { HGLogo } from '@/components/HGLogo';
import { Loader2, Eye, ArrowLeft } from 'lucide-react';

export default function JoinClient() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const es = language === 'es';
  const de = language === 'de';

  const [code, setCode] = useState(searchParams.get('code') || '');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!code.trim() || !user) return;
    setJoining(true);
    try {
      const { data, error } = await supabase.functions.invoke('join-client', {
        body: { code: code.trim().toUpperCase() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        de ? '✅ Zugang gewährt!' : es ? '✅ ¡Acceso concedido!' : '✅ Access granted!'
      );
      window.location.href = '/';
    } catch (e: any) {
      toast.error(e.message || (es ? 'Código inválido' : 'Invalid code'));
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <HGLogo size="lg" />
          </div>
          <CardTitle className="text-2xl font-serif">
            {de ? 'Kundenportal beitreten' : es ? 'Acceso de Cliente' : 'Client Portal Access'}
          </CardTitle>
          <CardDescription>
            {de
              ? 'Geben Sie den Code ein, den Ihr Landschaftsgärtner geteilt hat'
              : es
              ? 'Ingresa el código que te compartió tu paisajista'
              : 'Enter the code shared by your landscaper'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{de ? 'Zugangs-Code' : es ? 'Código de acceso' : 'Access Code'}</Label>
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              className="text-center text-2xl font-mono tracking-[0.3em] uppercase"
              maxLength={8}
            />
          </div>

          <Button onClick={handleJoin} disabled={!code.trim() || joining} className="w-full" size="lg">
            {joining ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />{es ? 'Accediendo...' : 'Joining...'}</>
            ) : (
              <><Eye className="h-4 w-4 mr-2" />{de ? 'Beitreten' : es ? 'Acceder' : 'Join'}</>
            )}
          </Button>

          <Button variant="ghost" className="w-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />{de ? 'Zurück' : es ? 'Volver' : 'Go Back'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
