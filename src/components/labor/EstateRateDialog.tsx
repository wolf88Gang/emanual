import React, { useState, useEffect } from 'react';
import { Settings, Save, DollarSign, SprayCan } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Currency, RateType, ServiceFrequency } from './types';
import type { EstateRate } from './useWorkerRates';

interface EstateRateDialogProps {
  language: string;
  currentRate: EstateRate | null;
  onSave: (rateType: RateType, rateAmount: number, currency: Currency, notes?: string) => Promise<void>;
}

const CLEANING_NOTE_PREFIX = 'service_template:cleaning';

export function EstateRateDialog({ language, currentRate, onSave }: EstateRateDialogProps) {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<Currency>(currentRate?.currency as Currency || 'USD');
  const [rateType, setRateType] = useState<RateType>(currentRate?.rate_type as RateType || 'hourly');
  const [rateAmount, setRateAmount] = useState(currentRate?.rate_amount || 15);
  const [serviceTemplate, setServiceTemplate] = useState<'general' | 'cleaning'>('general');
  const [cleaningFrequency, setCleaningFrequency] = useState<ServiceFrequency>('weekly');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentRate) {
      setCurrency(currentRate.currency as Currency);
      setRateType(currentRate.rate_type as RateType);
      setRateAmount(currentRate.rate_amount);
      const cleaningMatch = currentRate.notes?.match(/^service_template:cleaning;frequency:(daily|weekly|biweekly)$/);
      setServiceTemplate(cleaningMatch ? 'cleaning' : 'general');
      if (cleaningMatch?.[1]) setCleaningFrequency(cleaningMatch[1] as ServiceFrequency);
    }
  }, [currentRate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const notes = serviceTemplate === 'cleaning'
        ? `${CLEANING_NOTE_PREFIX};frequency:${cleaningFrequency}`
        : undefined;
      await onSave(rateType, rateAmount, currency, notes);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const currencySymbol = currency === 'CRC' ? '₡' : '$';
  const isSpanish = language === 'es';
  const isGerman = language === 'de';
  const t = (en: string, es: string, de: string) => isSpanish ? es : isGerman ? de : en;
  const rateUnit = rateType === 'hourly'
    ? t('hour', 'hora', 'Stunde')
    : rateType === 'daily'
      ? t('day', 'día', 'Tag')
      : t('service', 'servicio', 'Einsatz');

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
          <div className="space-y-2">
            <Label>{t('Work template', 'Plantilla de trabajo', 'Arbeitsvorlage')}</Label>
            <Select value={serviceTemplate} onValueChange={(value) => setServiceTemplate(value as 'general' | 'cleaning')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">{t('General labor', 'Mano de obra general', 'Allgemeine Arbeit')}</SelectItem>
                <SelectItem value="cleaning">{t('Cleaning service', 'Servicio de limpieza', 'Reinigungsservice')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {serviceTemplate === 'cleaning' && (
            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <SprayCan className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{t('Cleaning service', 'Servicio de limpieza', 'Reinigungsservice')}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t('Set the normal service frequency and whether it is billed by hour, day, or completed visit.', 'Defina la frecuencia normal y si se paga por hora, día o servicio completado.', 'Legen Sie Häufigkeit und Abrechnung pro Stunde, Tag oder abgeschlossenem Einsatz fest.')}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('Service frequency', 'Frecuencia del servicio', 'Servicehäufigkeit')}</Label>
                <Select value={cleaningFrequency} onValueChange={(value) => setCleaningFrequency(value as ServiceFrequency)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('Daily', 'Diaria', 'Täglich')}</SelectItem>
                    <SelectItem value="weekly">{t('Weekly', 'Semanal', 'Wöchentlich')}</SelectItem>
                    <SelectItem value="biweekly">{t('Every two weeks', 'Quincenal', 'Alle zwei Wochen')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

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
              <Label 
                htmlFor="dialog-task" 
                className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer flex-1 ${
                  rateType === 'task' ? 'border-primary bg-primary/10 font-medium' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="task" id="dialog-task" className="sr-only" />
                {t('Per service', 'Por servicio', 'Pro Einsatz')}
              </Label>
            </RadioGroup>
          </div>

          {/* Rate Amount */}
          <div className="space-y-2">
            <Label>
              {t(`Rate per ${rateUnit}`, `Tarifa por ${rateUnit}`, `Preis pro ${rateUnit}`)}
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
                ? `Tarifa actual: ${currentRate.currency === 'CRC' ? '₡' : '$'}${currentRate.rate_amount} por ${rateUnit} (desde ${currentRate.effective_from})`
                : `Current rate: ${currentRate.currency === 'CRC' ? '₡' : '$'}${currentRate.rate_amount} per ${rateUnit} (since ${currentRate.effective_from})`}
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
