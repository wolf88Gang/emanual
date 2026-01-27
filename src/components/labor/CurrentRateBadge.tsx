import React from 'react';
import { DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { EstateRate } from './useWorkerRates';

interface CurrentRateBadgeProps {
  rate: EstateRate | null;
  language: string;
}

export function CurrentRateBadge({ rate, language }: CurrentRateBadgeProps) {
  if (!rate) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <DollarSign className="h-3 w-3 mr-1" />
        {language === 'es' ? 'Sin tarifa configurada' : 'No rate configured'}
      </Badge>
    );
  }

  const symbol = rate.currency === 'CRC' ? '₡' : '$';
  const typeLabel = rate.rate_type === 'hourly' 
    ? (language === 'es' ? '/hora' : '/hr')
    : (language === 'es' ? '/día' : '/day');

  return (
    <Badge variant="secondary" className="font-mono">
      <DollarSign className="h-3 w-3 mr-1" />
      {symbol}{rate.rate_amount.toLocaleString()}{typeLabel}
    </Badge>
  );
}
