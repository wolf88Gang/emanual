import React, { useEffect, useMemo, useState } from 'react';
import { FileSignature, Plus, Loader2, CalendarClock, PartyPopper } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/currency';
import {
  fetchContracts,
  BILLING_PERIODS,
  CONTRACT_STATUS_TRANSITIONS,
  type ContractStatus,
  type RentalContractRow,
} from '@/lib/plantops';

interface ClientRow { id: string; name: string }

const emptyForm = {
  id: '',
  client_id: '',
  estate_id: '',
  contract_type: 'recurring',
  status: 'draft',
  starts_on: new Date().toISOString().slice(0, 10),
  ends_on: '',
  price_amount: '',
  currency: 'CRC',
  billing_period: 'monthly',
  maintenance_frequency: 'weekly',
  replacement_rules: '',
  client_dos_donts: '',
  internal_notes: '',
};

export default function PlantOpsContracts() {
  const { tl } = useLanguage();
  const { profile } = useAuth();
  const { estates } = useEstate();
  const orgId = profile?.org_id ?? null;
  const l = (en: string, es: string, de: string) => tl({ en, es, de });

  const [contracts, setContracts] = useState<RentalContractRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  /** Status the row had when opened — drives the allowed transitions. */
  const [originalStatus, setOriginalStatus] = useState<ContractStatus>('draft');

  const load = async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [ctr, cl] = await Promise.all([
        fetchContracts(orgId),
        supabase.from('clients').select('id, name').eq('org_id', orgId).order('name'),
      ]);
      setContracts(ctr);
      setClients((cl.data || []) as ClientRow[]);
    } catch (e: any) {
      toast.error(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? '—';
  const estateName = (id?: string | null) => estates.find((e) => e.id === id)?.name ?? '—';

  const openNew = () => { setForm({ ...emptyForm, client_id: clients[0]?.id ?? '' }); setOpen(true); };
  const openEdit = (c: RentalContractRow) => {
    setForm({
      id: c.id,
      client_id: c.client_id,
      estate_id: c.estate_id ?? '',
      contract_type: c.contract_type,
      status: c.status,
      starts_on: c.starts_on,
      ends_on: c.ends_on ?? '',
      price_amount: c.price_amount?.toString() ?? '',
      currency: c.currency || 'CRC',
      billing_period: c.billing_period ?? 'monthly',
      maintenance_frequency: c.maintenance_frequency ?? 'weekly',
      replacement_rules: c.replacement_rules ?? '',
      client_dos_donts: c.client_dos_donts ?? '',
      internal_notes: c.internal_notes ?? '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!orgId || !form.client_id || !form.starts_on) {
      toast.error(l('Client and start date are required', 'Cliente y fecha de inicio son obligatorios', 'Kunde und Startdatum erforderlich'));
      return;
    }
    if (form.contract_type === 'event' && !form.ends_on) {
      toast.error(l('Event contracts need an end date', 'Los contratos de evento requieren fecha de fin', 'Event-Verträge brauchen ein Enddatum'));
      return;
    }
    setBusy(true);
    try {
      const payload: any = {
        org_id: orgId,
        client_id: form.client_id,
        estate_id: form.estate_id || null,
        contract_type: form.contract_type,
        status: form.status,
        starts_on: form.starts_on,
        ends_on: form.ends_on || null,
        price_amount: form.price_amount ? Number(form.price_amount) : null,
        currency: form.currency,
        billing_period: form.billing_period || null,
        maintenance_frequency: form.maintenance_frequency || null,
        replacement_rules: form.replacement_rules || null,
        client_dos_donts: form.client_dos_donts || null,
        internal_notes: form.internal_notes || null,
      };
      const { error } = form.id
        ? await supabase.from('rental_contracts').update(payload).eq('id', form.id)
        : await supabase.from('rental_contracts').insert(payload);
      if (error) throw error;
      toast.success(l('Contract saved', 'Contrato guardado', 'Vertrag gespeichert'));
      setOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Error');
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = (s: string) =>
    ({
      draft: l('Draft', 'Borrador', 'Entwurf'),
      active: l('Active', 'Activo', 'Aktiv'),
      ended: l('Ended', 'Finalizado', 'Beendet'),
      cancelled: l('Cancelled', 'Cancelado', 'Storniert'),
    } as Record<string, string>)[s] ?? s;

  const billingLabel = (b: string) =>
    ({
      monthly: l('Monthly', 'Mensual', 'Monatlich'),
      quarterly: l('Quarterly', 'Trimestral', 'Vierteljährlich'),
      event: l('Per event', 'Por evento', 'Pro Event'),
      other: l('Other', 'Otro', 'Andere'),
    } as Record<string, string>)[b] ?? b;

  const statusBadge = (s: string) => {
    const cls: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground border-border',
      active: 'bg-primary/15 text-primary border-primary/30',
      ended: 'bg-destructive/10 text-destructive border-destructive/30',
      cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
    };
    return <Badge variant="outline" className={cls[s]}>{statusLabel(s)}</Badge>;
  };

  const grouped = useMemo(() => ({
    recurring: contracts.filter((c) => c.contract_type === 'recurring'),
    event: contracts.filter((c) => c.contract_type === 'event'),
  }), [contracts]);

  const renderTable = (rows: RentalContractRow[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{l('Client', 'Cliente', 'Kunde')}</TableHead>
          <TableHead>{l('Site', 'Sede', 'Standort')}</TableHead>
          <TableHead>{l('Period', 'Periodo', 'Zeitraum')}</TableHead>
          <TableHead>{l('Price', 'Precio', 'Preis')}</TableHead>
          <TableHead>{l('Status', 'Estado', 'Status')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id} className="cursor-pointer" onClick={() => openEdit(c)}>
            <TableCell className="font-medium">{clientName(c.client_id)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{estateName(c.estate_id)}</TableCell>
            <TableCell className="text-sm">
              {format(new Date(c.starts_on), 'dd MMM yyyy')}
              {c.ends_on ? ` → ${format(new Date(c.ends_on), 'dd MMM yyyy')}` : ''}
            </TableCell>
            <TableCell className="text-sm">
              {c.price_amount != null ? formatCurrency(c.price_amount, c.currency as any) : '—'}
              {c.billing_period ? ` / ${c.billing_period}` : ''}
            </TableCell>
            <TableCell>{statusBadge(c.status)}</TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{l('No contracts yet', 'Aún no hay contratos', 'Noch keine Verträge')}</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <ModernAppLayout>
      <main className="p-4 md:p-6 space-y-6 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSignature className="h-6 w-6 text-primary" />
              {l('Rental contracts', 'Contratos de alquiler', 'Mietverträge')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {l('Recurring maintenance plans and one-off event rentals', 'Planes recurrentes de mantenimiento y alquileres puntuales para eventos', 'Wiederkehrende Pläne und Event-Mieten')}
            </p>
          </div>
          <Button onClick={openNew} disabled={clients.length === 0}>
            <Plus className="h-4 w-4 mr-1" />{l('New contract', 'Nuevo contrato', 'Neuer Vertrag')}
          </Button>
        </div>

        {clients.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            {l('Add a client first in the Sales section.', 'Primero agregue un cliente en la sección de Ventas.', 'Fügen Sie zuerst einen Kunden hinzu.')}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />{l('Recurring', 'Recurrentes', 'Wiederkehrend')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">{renderTable(grouped.recurring)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PartyPopper className="h-4 w-4" />{l('Events', 'Eventos', 'Events')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">{renderTable(grouped.event)}</CardContent>
            </Card>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? l('Edit contract', 'Editar contrato', 'Vertrag bearbeiten') : l('New contract', 'Nuevo contrato', 'Neuer Vertrag')}</DialogTitle>
              <DialogDescription>{l('Define scope, price and care rules', 'Defina alcance, precio y reglas de cuidado', 'Umfang, Preis und Pflegeregeln festlegen')}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>{l('Client', 'Cliente', 'Kunde')}</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder={l('Select client', 'Seleccione cliente', 'Kunde wählen')} /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>{l('Site (optional)', 'Sede (opcional)', 'Standort (optional)')}</Label>
                <Select value={form.estate_id} onValueChange={(v) => setForm({ ...form, estate_id: v })}>
                  <SelectTrigger><SelectValue placeholder={l('No specific site', 'Sin sede específica', 'Kein Standort')} /></SelectTrigger>
                  <SelectContent>{estates.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{l('Type', 'Tipo', 'Typ')}</Label>
                <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring">{l('Recurring', 'Recurrente', 'Wiederkehrend')}</SelectItem>
                    <SelectItem value="event">{l('Event', 'Evento', 'Event')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{l('Status', 'Estado', 'Status')}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{l('Draft', 'Borrador', 'Entwurf')}</SelectItem>
                    <SelectItem value="active">{l('Active', 'Activo', 'Aktiv')}</SelectItem>
                    <SelectItem value="ended">{l('Ended', 'Finalizado', 'Beendet')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{l('Starts on', 'Inicia', 'Beginn')}</Label>
                <Input type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{l('Ends on', 'Termina', 'Ende')}</Label>
                <Input type="date" value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{l('Price', 'Precio', 'Preis')}</Label>
                <Input type="number" min={0} value={form.price_amount} onChange={(e) => setForm({ ...form, price_amount: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{l('Currency', 'Moneda', 'Währung')}</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC">CRC</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.contract_type === 'recurring' && (
                <>
                  <div className="space-y-1">
                    <Label>{l('Billing period', 'Periodo de cobro', 'Abrechnung')}</Label>
                    <Select value={form.billing_period} onValueChange={(v) => setForm({ ...form, billing_period: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">{l('Monthly', 'Mensual', 'Monatlich')}</SelectItem>
                        <SelectItem value="quarterly">{l('Quarterly', 'Trimestral', 'Vierteljährlich')}</SelectItem>
                        <SelectItem value="annual">{l('Annual', 'Anual', 'Jährlich')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{l('Maintenance frequency', 'Frecuencia de mantenimiento', 'Wartungsfrequenz')}</Label>
                    <Select value={form.maintenance_frequency} onValueChange={(v) => setForm({ ...form, maintenance_frequency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">{l('Weekly', 'Semanal', 'Wöchentlich')}</SelectItem>
                        <SelectItem value="biweekly">{l('Biweekly', 'Quincenal', 'Zweiwöchentlich')}</SelectItem>
                        <SelectItem value="monthly">{l('Monthly', 'Mensual', 'Monatlich')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="col-span-2 space-y-1">
                <Label>{l('Replacement rules', 'Reglas de reemplazo', 'Ersatzregeln')}</Label>
                <Textarea rows={2} value={form.replacement_rules} onChange={(e) => setForm({ ...form, replacement_rules: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>{l('Client do / don\'t', 'Qué debe y no debe hacer el cliente', 'Kunden-Hinweise')}</Label>
                <Textarea rows={2} value={form.client_dos_donts} onChange={(e) => setForm({ ...form, client_dos_donts: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>{l('Internal notes', 'Notas internas', 'Interne Notizen')}</Label>
                <Textarea rows={2} value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{l('Cancel', 'Cancelar', 'Abbrechen')}</Button>
              <Button onClick={save} disabled={busy}>{l('Save', 'Guardar', 'Speichern')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </ModernAppLayout>
  );
}
