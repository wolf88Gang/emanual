import React from 'react';
import { DollarSign, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Currency, RateType } from './types';

interface RateConfigCardProps {
  language: string;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  rateType: RateType;
  onRateTypeChange: (type: RateType) => void;
  rateAmount: number;
  onRateAmountChange: (amount: number) => void;
}

export function RateConfigCard({
  language,
  currency,
  onCurrencyChange,
  rateType,
  onRateTypeChange,
  rateAmount,
  onRateAmountChange,
}: RateConfigCardProps) {
  const currencySymbol = currency === 'CRC' ? '₡' : '$';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">
            {language === 'es' ? 'Configuración de Tarifas' : 'Rate Configuration'}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Currency */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {language === 'es' ? 'Moneda' : 'Currency'}
            </Label>
            <RadioGroup 
              value={currency} 
              onValueChange={(v) => onCurrencyChange(v as Currency)}
              className="flex gap-2"
            >
              <Label 
                htmlFor="rate-usd" 
                className={`flex items-center justify-center gap-1 p-2 rounded-lg border cursor-pointer flex-1 text-sm ${
                  currency === 'USD' ? 'border-primary bg-primary/10 font-medium' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="USD" id="rate-usd" className="sr-only" />
                $ USD
              </Label>
              <Label 
                htmlFor="rate-crc" 
                className={`flex items-center justify-center gap-1 p-2 rounded-lg border cursor-pointer flex-1 text-sm ${
                  currency === 'CRC' ? 'border-primary bg-primary/10 font-medium' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="CRC" id="rate-crc" className="sr-only" />
                ₡ CRC
              </Label>
            </RadioGroup>
          </div>

          {/* Rate Type */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {language === 'es' ? 'Tipo de Tarifa' : 'Rate Type'}
            </Label>
            <RadioGroup 
              value={rateType} 
              onValueChange={(v) => onRateTypeChange(v as RateType)}
              className="flex gap-2"
            >
              <Label 
                htmlFor="rate-hourly" 
                className={`flex items-center justify-center p-2 rounded-lg border cursor-pointer flex-1 text-xs ${
                  rateType === 'hourly' ? 'border-primary bg-primary/10 font-medium' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="hourly" id="rate-hourly" className="sr-only" />
                {language === 'es' ? 'Por hora' : 'Hourly'}
              </Label>
              <Label 
                htmlFor="rate-daily" 
                className={`flex items-center justify-center p-2 rounded-lg border cursor-pointer flex-1 text-xs ${
                  rateType === 'daily' ? 'border-primary bg-primary/10 font-medium' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="daily" id="rate-daily" className="sr-only" />
                {language === 'es' ? 'Diario' : 'Daily'}
              </Label>
            </RadioGroup>
          </div>

          {/* Rate Amount */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {language === 'es' 
                ? `Tarifa ${rateType === 'hourly' ? 'por hora' : 'diaria'}` 
                : `${rateType === 'hourly' ? 'Hourly' : 'Daily'} Rate`}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                {currencySymbol}
              </span>
              <Input
                type="number"
                min={0}
                step={currency === 'CRC' ? 500 : 0.5}
                value={rateAmount}
                onChange={(e) => onRateAmountChange(parseFloat(e.target.value) || 0)}
                className="pl-7 font-mono"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
