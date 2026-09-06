import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PlatformOrganization } from '@/lib/platformAdmin';

interface Props {
  organization: PlatformOrganization | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}

export function PlanEditorDialog({ organization, onOpenChange, onSaved }: Props) {
  const { language } = useLanguage();
  const l = (en: string, es: string, de: string) => language === 'es' ? es : language === 'de' ? de : en;
  const [status, setStatus] = useState('inactive');
  const [planType, setPlanType] = useState('monthly');
  const [amount, setAmount] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!organization) return;
    setStatus(organization.subscription?.status ?? 'inactive');
    setPlanType(organization.subscription?.plan_type ?? 'monthly');
    setAmount(String(organization.subscription?.amount ?? 0));
    setCurrency(organization.subscription?.currency === 'CRC' ? 'CRC' : 'USD');
  }, [organization]);

  async function save() {
    if (!organization) return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      toast.error(l('Enter a valid non-negative amount.', 'Ingresa un monto válido.', 'Geben Sie einen gültigen Betrag ein.'));
      return;
    }
    setSaving(true);
    try {
      if (organization.subscription) {
        const { error } = await supabase.from('subscriptions').update({
          status, plan_type: planType, amount: numericAmount, currency,
        }).eq('id', organization.subscription.id);
        if (error) throw error;
      } else {
        const contact = organization.members[0];
        if (!contact) throw new Error(l('This organization has no member to bill.', 'Esta organización no tiene un miembro para facturar.', 'Diese Organisation hat kein abrechenbares Mitglied.'));
        const { error } = await supabase.from('subscriptions').insert({
          org_id: organization.id,
          user_id: contact.id,
          status,
          plan_type: planType,
          amount: numericAmount,
          currency,
        });
        if (error) throw error;
      }
      await onSaved();
      toast.success(l('Plan saved.', 'Plan guardado.', 'Plan gespeichert.'));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : l('Plan could not be saved.', 'No se pudo guardar el plan.', 'Plan konnte nicht gespeichert werden.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(organization)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{l('Edit plan', 'Editar plan', 'Plan bearbeiten')}</DialogTitle>
          <DialogDescription>{organization?.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2"><Label>{l('Status', 'Estado', 'Status')}</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">{l('Active', 'Activo', 'Aktiv')}</SelectItem><SelectItem value="trial">{l('Trial', 'Prueba', 'Testphase')}</SelectItem><SelectItem value="inactive">{l('Inactive', 'Inactivo', 'Inaktiv')}</SelectItem><SelectItem value="cancelled">{l('Cancelled', 'Cancelado', 'Storniert')}</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>{l('Billing cycle', 'Ciclo de cobro', 'Abrechnungszyklus')}</Label><Select value={planType} onValueChange={setPlanType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">{l('Monthly', 'Mensual', 'Monatlich')}</SelectItem><SelectItem value="annual">{l('Annual', 'Anual', 'Jährlich')}</SelectItem><SelectItem value="trial">{l('Trial', 'Prueba', 'Testphase')}</SelectItem><SelectItem value="unlimited">{l('Unlimited', 'Ilimitado', 'Unbegrenzt')}</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>{l('Amount', 'Monto', 'Betrag')}</Label><Input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
          <div className="space-y-2"><Label>{l('Currency', 'Moneda', 'Währung')}</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="CRC">CRC</SelectItem></SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>{l('Cancel', 'Cancelar', 'Abbrechen')}</Button><Button onClick={save} disabled={saving}>{saving ? l('Saving...', 'Guardando...', 'Speichern...') : l('Save plan', 'Guardar plan', 'Plan speichern')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}