import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription, PRICE_PER_PROPERTY } from '@/contexts/SubscriptionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Crown, Lock, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TrialGateProps {
  feature: 'reports' | 'pdf_export' | 'unlimited_assets' | 'labor' | 'compost' | 'crm' | 'topography' | 'ai_manual' | 'add_property';
  children: React.ReactNode;
  inline?: boolean;
}

const FEATURE_NAMES: Record<string, { en: string; es: string; de: string }> = {
  reports: { en: 'Reports & Manuals', es: 'Reportes y Manuales', de: 'Berichte & Handbücher' },
  pdf_export: { en: 'PDF Export', es: 'Exportar PDF', de: 'PDF-Export' },
  unlimited_assets: { en: 'Unlimited Assets', es: 'Activos Ilimitados', de: 'Unbegrenzte Assets' },
  labor: { en: 'Labor Management', es: 'Gestión Laboral', de: 'Arbeitsverwaltung' },
  compost: { en: 'Compost Manager', es: 'Gestor de Compost', de: 'Kompost-Manager' },
  crm: { en: 'Sales & CRM', es: 'Ventas y CRM', de: 'Vertrieb & CRM' },
  topography: { en: 'Topography Analysis', es: 'Análisis Topográfico', de: 'Topografie-Analyse' },
  ai_manual: { en: 'AI Manual Generation', es: 'Generación de Manual IA', de: 'KI-Handbuch-Erstellung' },
  add_property: { en: 'Add More Properties', es: 'Añadir Más Propiedades', de: 'Weitere Immobilien hinzufügen' },
};

export function TrialGate({ feature, children, inline }: TrialGateProps) {
  const { canAccessFeature, isTrial, isExpired, trialDaysLeft } = useSubscription();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const es = language === 'es';
  const de = language === 'de';

  if (canAccessFeature(feature)) {
    return <>{children}</>;
  }

  const featureName = FEATURE_NAMES[feature] || { en: feature, es: feature, de: feature };
  const name = de ? featureName.de : es ? featureName.es : featureName.en;

  if (inline) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/subscription')}
        className="gap-1.5 text-muted-foreground border-dashed"
      >
        <Lock className="h-3.5 w-3.5" />
        {de ? 'Pro-Plan erforderlich' : es ? 'Requiere plan Pro' : 'Requires Pro plan'}
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
          <h2 className="text-2xl font-serif font-semibold text-foreground">{name}</h2>
          <p className="text-muted-foreground">
            {isExpired
              ? (de ? 'Ihre Testversion ist abgelaufen. Abonnieren Sie für $20/Monat pro Immobilie.' 
                 : es ? 'Tu prueba ha expirado. Suscríbete por $20/mes por propiedad.' 
                 : 'Your trial has expired. Subscribe for $20/mo per property.')
              : isTrial
                ? (de ? `Diese Funktion ist in der Testversion nicht verfügbar. Noch ${trialDaysLeft} Tage.` 
                   : es ? `Esta función no está disponible en la prueba. Te quedan ${trialDaysLeft} días.` 
                   : `This feature is not available during the trial. You have ${trialDaysLeft} days left.`)
                : (de ? 'Abonnieren Sie für $20/Monat pro Immobilie.' 
                   : es ? 'Suscríbete por $20/mes por propiedad.' 
                   : 'Subscribe for $20/mo per property.')
            }
          </p>
          <Button onClick={() => navigate('/subscription')} className="gap-2">
            <Crown className="h-4 w-4" />
            {de ? 'Pläne anzeigen' : es ? 'Ver planes' : 'View Plans'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
