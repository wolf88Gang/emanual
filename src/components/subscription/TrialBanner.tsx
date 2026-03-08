import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Crown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TrialBanner() {
  const { isTrial, isExpired, trialDaysLeft, isPaid, status } = useSubscription();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const es = language === 'es';

  if (isPaid || status === 'loading') return null;
  if (!isTrial && !isExpired) return null;

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
        <span>
          {isExpired
            ? (es ? 'Tu prueba gratuita ha expirado' : 'Your free trial has expired')
            : (es ? `Prueba gratuita: ${trialDaysLeft} días restantes · Máx 3 activos` : `Free trial: ${trialDaysLeft} days left · Max 3 assets`)
          }
        </span>
      </div>
      <Button 
        size="sm" 
        variant={isExpired ? 'destructive' : 'default'}
        onClick={() => navigate('/subscription')}
        className="gap-1 flex-shrink-0 h-7 text-xs"
      >
        <Crown className="h-3 w-3" />
        {es ? 'Suscribirse' : 'Upgrade'}
      </Button>
    </div>
  );
}
