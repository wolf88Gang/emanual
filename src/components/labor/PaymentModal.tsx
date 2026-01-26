import React, { useState, useEffect } from 'react';
import { 
  Banknote, 
  CreditCard, 
  Wallet,
  Calendar,
  Hash
} from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { WorkerShift, PaymentMethod, Currency } from './types';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: WorkerShift | null;
  language: string;
  defaultCurrency: Currency;
  hourlyRate: number;
  onConfirm: (
    shiftId: string,
    validationId: string | null,
    amount: number,
    currency: Currency,
    paymentMethod: PaymentMethod,
    paymentDate: string,
    reference: string | null,
    notes: string | null
  ) => void;
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function PaymentModal({ 
  open, 
  onOpenChange, 
  shift, 
  language,
  defaultCurrency,
  hourlyRate,
  onConfirm 
}: PaymentModalProps) {
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const dateLocale = language === 'es' ? es : undefined;

  const originalMinutes = shift?.check_out_at && shift?.check_in_at
    ? differenceInMinutes(parseISO(shift.check_out_at), parseISO(shift.check_in_at))
    : 0;
  
  const effectiveMinutes = shift?.validation?.adjusted_minutes ?? originalMinutes;

  useEffect(() => {
    if (shift && open) {
      setCurrency(defaultCurrency);
      const calculatedAmount = (effectiveMinutes / 60) * hourlyRate;
      setAmount(Math.round(calculatedAmount * 100) / 100);
      setPaymentMethod('transfer');
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setReference('');
      setNotes('');
    }
  }, [shift, open, defaultCurrency, hourlyRate, effectiveMinutes]);

  const handleConfirm = () => {
    if (!shift) return;
    
    onConfirm(
      shift.id,
      shift.validation?.id || null,
      amount,
      currency,
      paymentMethod,
      paymentDate,
      reference || null,
      notes || null
    );
    
    onOpenChange(false);
  };

  if (!shift) return null;

  const currencySymbol = currency === 'CRC' ? '₡' : '$';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-600" />
            {language === 'es' ? 'Registrar Pago' : 'Record Payment'}
          </DialogTitle>
          <DialogDescription>
            {language === 'es' 
              ? 'Registra el pago para cerrar este turno'
              : 'Record payment to close this shift'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Shift Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {language === 'es' ? 'Trabajador' : 'Worker'}
              </span>
              <span className="font-medium">
                {shift.user?.full_name || shift.user?.email}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {language === 'es' ? 'Fecha' : 'Date'}
              </span>
              <span>
                {format(parseISO(shift.check_in_at), 'd MMM yyyy', { locale: dateLocale })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {language === 'es' ? 'Horas' : 'Hours'}
              </span>
              <span className="font-mono">
                {formatMinutes(effectiveMinutes)}
                {shift.validation?.adjusted_minutes && shift.validation.adjusted_minutes !== originalMinutes && (
                  <span className="text-muted-foreground line-through ml-2 text-xs">
                    {formatMinutes(originalMinutes)}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Currency Selection */}
          <div className="space-y-2">
            <Label>{language === 'es' ? 'Moneda' : 'Currency'}</Label>
            <RadioGroup 
              value={currency} 
              onValueChange={(v) => setCurrency(v as Currency)}
              className="flex gap-4"
            >
              <Label 
                htmlFor="usd" 
                className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer flex-1 ${
                  currency === 'USD' ? 'border-primary bg-primary/10' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="USD" id="usd" className="sr-only" />
                <span className="font-mono text-lg">$</span>
                <span>USD</span>
              </Label>
              <Label 
                htmlFor="crc" 
                className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer flex-1 ${
                  currency === 'CRC' ? 'border-primary bg-primary/10' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="CRC" id="crc" className="sr-only" />
                <span className="font-mono text-lg">₡</span>
                <span>CRC</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>{language === 'es' ? 'Monto' : 'Amount'}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                {currencySymbol}
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="pl-8 font-mono text-lg"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>{language === 'es' ? 'Método de Pago' : 'Payment Method'}</Label>
            <RadioGroup 
              value={paymentMethod} 
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              className="grid grid-cols-2 gap-2"
            >
              <Label 
                htmlFor="transfer" 
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                  paymentMethod === 'transfer' ? 'border-primary bg-primary/10' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="transfer" id="transfer" className="sr-only" />
                <CreditCard className="h-4 w-4" />
                <span className="text-sm">{language === 'es' ? 'Transferencia' : 'Transfer'}</span>
              </Label>
              <Label 
                htmlFor="cash" 
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                  paymentMethod === 'cash' ? 'border-primary bg-primary/10' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="cash" id="cash" className="sr-only" />
                <Wallet className="h-4 w-4" />
                <span className="text-sm">{language === 'es' ? 'Efectivo' : 'Cash'}</span>
              </Label>
              <Label 
                htmlFor="check" 
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                  paymentMethod === 'check' ? 'border-primary bg-primary/10' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="check" id="check" className="sr-only" />
                <Hash className="h-4 w-4" />
                <span className="text-sm">{language === 'es' ? 'Cheque' : 'Check'}</span>
              </Label>
              <Label 
                htmlFor="other" 
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                  paymentMethod === 'other' ? 'border-primary bg-primary/10' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="other" id="other" className="sr-only" />
                <Banknote className="h-4 w-4" />
                <span className="text-sm">{language === 'es' ? 'Otro' : 'Other'}</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {language === 'es' ? 'Fecha de Pago' : 'Payment Date'}
            </Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label>{language === 'es' ? 'Referencia (opcional)' : 'Reference (optional)'}</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={language === 'es' ? 'Número de transferencia, recibo, etc.' : 'Transfer number, receipt, etc.'}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{language === 'es' ? 'Notas (opcional)' : 'Notes (optional)'}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={language === 'es' ? 'Notas adicionales...' : 'Additional notes...'}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleConfirm}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Banknote className="h-4 w-4 mr-2" />
              {language === 'es' ? 'Registrar Pago' : 'Record Payment'}
              <span className="ml-2 font-mono">
                {currencySymbol}{amount.toFixed(2)}
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
