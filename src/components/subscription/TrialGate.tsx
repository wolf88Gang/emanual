import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TrialGateProps {
  feature: 'reports' | 'pdf_export' | 'unlimited_assets' | 'labor' | 'compost' | 'crm' | 'topography' | 'ai_manual';
  children: React.ReactNode;
  /** If true, renders inline badge instead of full-page block */
  inline?: boolean;
}

const FEATURE_NAMES: Record<string, { en: string; es: string }> = {
  reports: { en: 'Reports & Manuals', es: 'Reportes y Manuales' },
  pdf_export: { en: 'PDF Export', es: 'Exportar PDF' },
  unlimited_assets: { en: 'Unlimited Assets', es: 'Activos Ilimitados' },
  labor: { en: 'Labor Management', es: 'Gestión Laboral' },
  compost: { en: 'Compost Manager', es: 'Gestor de Compost' },
  crm: { en: 'Sales & CRM', es: 'Ventas y CRM' },
  topography: { en: 'Topography Analysis', es: 'Análisis Topográfico' },
  ai_manual: { en: 'AI Manual Generation', es: 'Generación de Manual IA' },
};

export function TrialGate({ feature, children, inline }: TrialGateProps) {
  const { canAccessFeature, isTrial, isExpired, trialDaysLeft } = useSubscription();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const es = language === 'es';

  if (canAccessFeature(feature)) {
    return <>{children}</>;
  }

  const featureName = FEATURE_NAMES[feature] || { en: feature, es: feature };

  if (inline) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/subscription')}
        className="gap-1.5 text-muted-foreground border-dashed"
      >
        <Lock className="h-3.5 w-3.5" />
        {es ? 'Requiere plan Pro' : 'Requires Pro plan'}
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-6 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Crown className="h-8 w-8 text-accent" />
          </div>
          <h2 className="text-2xl font-serif font-semibold text-foreground">
            {es ? featureName.es : featureName.en}
          </h2>
          <p className="text-muted-foreground">
            {isExpired
              ? (es ? 'Tu prueba gratuita ha expirado. Suscríbete para acceder a esta función.' : 'Your free trial has expired. Subscribe to access this feature.')
              : isTrial
                ? (es ? `Esta función no está disponible durante la prueba gratuita. Te quedan ${trialDaysLeft} días.` : `This feature is not available during the free trial. You have ${trialDaysLeft} days left.`)
                : (es ? 'Suscríbete para acceder a esta función.' : 'Subscribe to access this feature.')
            }
          </p>
          <Button onClick={() => navigate('/subscription')} className="gap-2">
            <Crown className="h-4 w-4" />
            {es ? 'Ver planes' : 'View Plans'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
