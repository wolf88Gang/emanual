import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Crown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Safe import - don't throw if no provider
const SubscriptionContext = React.createContext<any>(undefined);

export function TrialBanner() {
  // Use the actual context from SubscriptionContext module
  let sub: any;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const mod = require('@/contexts/SubscriptionContext');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    sub = mod.useSubscription();
  } catch {
    return null; // No provider available, skip banner
  }
  
  const { isTrial, isExpired, trialDaysLeft, isPaid, status } = sub;
  const { language } = useLanguage();
  const navigate = useNavigate();
  const es = language === 'es';
  const de = language === 'de';

  if (isPaid || status === 'loading') return null;
  if (!isTrial && !isExpired && status !== 'none') return null;

  const trialText = isExpired
    ? (de ? 'Ihre Testversion ist abgelaufen' : es ? 'Tu prueba gratuita ha expirado' : 'Your free trial has expired')
    : (de 
        ? `Testversion: ${trialDaysLeft} Tage · 1 Immobilie · Max 3 Assets` 
        : es 
          ? `Prueba: ${trialDaysLeft} días · 1 propiedad · Máx 3 activos` 
          : `Trial: ${trialDaysLeft} days · 1 property · Max 3 assets`);

  return (
    <div className={`px-4 py-2 text-sm flex items-center justify-between gap-2 ${
      isExpired 
        ? 'bg-destructive/10 text-destructive border-b border-destructive/20' 
        : trialDaysLeft <= 3 
          ? 'bg-warning/10 text-warning border-b border-warning/20'
          : 'bg-accent/10 text-accent-foreground border-b border-accent/20'
    }`}>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 flex-shrink-0" />
        <span>{trialText}</span>
      </div>
      <Button 
        size="sm" 
        variant={isExpired ? 'destructive' : 'default'}
        onClick={() => navigate('/subscription')}
        className="gap-1 flex-shrink-0 h-7 text-xs"
      >
        <Crown className="h-3 w-3" />
        {de ? 'Upgrade' : es ? 'Suscribirse' : 'Upgrade'}
      </Button>
    </div>
  );
}
