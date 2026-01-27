import React, { useState, useEffect } from 'react';
import { Settings, Save, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Currency, RateType } from './types';
import type { EstateRate } from './useWorkerRates';

interface EstateRateDialogProps {
  language: string;
  currentRate: EstateRate | null;
  onSave: (rateType: RateType, rateAmount: number, currency: Currency) => Promise<void>;
}

export function EstateRateDialog({ language, currentRate, onSave }: EstateRateDialogProps) {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<Currency>(currentRate?.currency as Currency || 'USD');
  const [rateType, setRateType] = useState<RateType>(currentRate?.rate_type as RateType || 'hourly');
  const [rateAmount, setRateAmount] = useState(currentRate?.rate_amount || 15);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentRate) {
      setCurrency(currentRate.currency as Currency);
      setRateType(currentRate.rate_type as RateType);
      setRateAmount(currentRate.rate_amount);
    }
  }, [currentRate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(rateType, rateAmount, currency);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const currencySymbol = currency === 'CRC' ? '₡' : '$';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          {language === 'es' ? 'Tarifa por Defecto' : 'Default Rate'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {language === 'es' ? 'Tarifa por Defecto de la Finca' : 'Estate Default Rate'}
          </DialogTitle>
          <DialogDescription>
            {language === 'es' 
              ? 'Esta tarifa se aplica a todos los trabajadores que no tienen una tarifa individual configurada.'
              : 'This rate applies to all workers without an individual rate configured.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Currency */}
          <div className="space-y-2">
            <Label>{language === 'es' ? 'Moneda' : 'Currency'}</Label>
            <RadioGroup 
              value={currency} 
              onValueChange={(v) => setCurrency(v as Currency)}
              className="flex gap-3"
            >
              <Label 
                htmlFor="dialog-usd" 
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer flex-1 ${
                  currency === 'USD' ? 'border-primary bg-primary/10 font-medium' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="USD" id="dialog-usd" className="sr-only" />
                $ USD
              </Label>
              <Label 
                htmlFor="dialog-crc" 
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer flex-1 ${
                  currency === 'CRC' ? 'border-primary bg-primary/10 font-medium' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="CRC" id="dialog-crc" className="sr-only" />
                ₡ CRC
              </Label>
            </RadioGroup>
          </div>

          {/* Rate Type */}
          <div className="space-y-2">
            <Label>{language === 'es' ? 'Tipo de Tarifa' : 'Rate Type'}</Label>
            <RadioGroup 
              value={rateType} 
              onValueChange={(v) => setRateType(v as RateType)}
              className="flex gap-3"
            >
              <Label 
                htmlFor="dialog-hourly" 
                className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer flex-1 ${
                  rateType === 'hourly' ? 'border-primary bg-primary/10 font-medium' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="hourly" id="dialog-hourly" className="sr-only" />
                {language === 'es' ? 'Por Hora' : 'Hourly'}
              </Label>
              <Label 
                htmlFor="dialog-daily" 
                className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer flex-1 ${
                  rateType === 'daily' ? 'border-primary bg-primary/10 font-medium' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="daily" id="dialog-daily" className="sr-only" />
                {language === 'es' ? 'Diario' : 'Daily'}
              </Label>
            </RadioGroup>
          </div>

          {/* Rate Amount */}
          <div className="space-y-2">
            <Label>
              {language === 'es' 
                ? `Tarifa ${rateType === 'hourly' ? 'por Hora' : 'Diaria'}` 
                : `${rateType === 'hourly' ? 'Hourly' : 'Daily'} Rate`}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                {currencySymbol}
              </span>
              <Input
                type="number"
                min={0}
                step={currency === 'CRC' ? 500 : 0.5}
                value={rateAmount}
                onChange={(e) => setRateAmount(parseFloat(e.target.value) || 0)}
                className="pl-8 font-mono text-lg"
              />
            </div>
          </div>

          {/* Current Rate Info */}
          {currentRate && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              {language === 'es' 
                ? `Tarifa actual: ${currentRate.currency === 'CRC' ? '₡' : '$'}${currentRate.rate_amount} ${currentRate.rate_type === 'hourly' ? 'por hora' : 'diario'} (desde ${currentRate.effective_from})`
                : `Current rate: ${currentRate.currency === 'CRC' ? '₡' : '$'}${currentRate.rate_amount} ${currentRate.rate_type} (since ${currentRate.effective_from})`}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving 
              ? (language === 'es' ? 'Guardando...' : 'Saving...') 
              : (language === 'es' ? 'Guardar' : 'Save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
