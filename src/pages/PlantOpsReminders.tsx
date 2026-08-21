import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, Loader2, Mail, MessageCircle, Plus, RefreshCw, Check, X } from 'lucide-react';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrgType } from '@/hooks/usePlantOps';
import { useModules } from '@/hooks/useModules';
import { fetchClientWorkspace, type ClientWorkspaceRow } from '@/lib/plantopsClients';
import { Switch } from '@/components/ui/switch';
import { Droplets } from 'lucide-react';
import { fetchCareQueue, fetchWaterReminderFlags, setWaterReminders, type CareQueueRow } from '@/lib/plantopsCare';
import {
  CUSTOM_REMINDER_TYPES,
  MESSAGE_TYPE_LABELS,
  cancelMessage,
  enqueueDueReminders,
  fetchClientContacts,
  fetchOrgOutbox,
  mailtoUrl,
  maintenanceReminderMessage,
  markMessageSent,
  queueMessage,
  retryMessage,
  whatsappUrl,
  type ClientContact,
  type MessageType,
  type OutboxMessage,
} from '@/lib/plantopsComms';

/**
 * Reminders module: one screen for everything the client must be told.
 * Delivery never requires a paid provider — every message can be sent by hand
 * through email or WhatsApp and then marked as sent (auditable).
 */
export default function PlantOpsReminders() {
  const { language, tl } = useLanguage();
  const { orgId } = useOrgType();
  const { isEnabled } = useModules();
  const { toast } = useToast();
  const l = (en: string, es: string, de = en) => tl({ en, es, de });

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<OutboxMessage[]>([]);
  const [clients, setClients] = useState<ClientWorkspaceRow[]>([]);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [wateringRows, setWateringRows] = useState<CareQueueRow[]>([]);
  const [wateringFlags, setWateringFlags] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    clientId: '',
    estateId: '',
    contactId: '',
    type: 'light_check' as MessageType,
    channel: 'email' as 'email' | 'whatsapp',
    dueDate: '',
    instruction: '',
    scheduledAt: '',
  });

  useEffect(() => {
    document.title = l('Reminders', 'Recordatorios', 'Erinnerungen');
  }, [language]);

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [out, cl, queue] = await Promise.all([
        fetchOrgOutbox(orgId),
        fetchClientWorkspace(orgId),
        fetchCareQueue(null).catch(() => [] as CareQueueRow[]),
      ]);
      setMessages(out);
      setClients(cl);
      setWateringRows(queue);
      setWateringFlags(await fetchWaterReminderFlags(queue.map((q) => q.placement_id)).catch(() => ({})));
    } catch (e: any) {
      toast({ title: l('Could not load reminders', 'No se pudieron cargar los recordatorios'), description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [orgId]);

  useEffect(() => {
    if (!form.clientId) { setContacts([]); return; }
    fetchClientContacts(form.clientId).then(setContacts).catch(() => setContacts([]));
  }, [form.clientId]);

  const groups = useMemo(() => ({
    due: messages.filter((m) => m.status === 'queued' && (!m.scheduled_at || m.scheduled_at <= new Date().toISOString())),
    scheduled: messages.filter((m) => m.status === 'queued' && !!m.scheduled_at && m.scheduled_at > new Date().toISOString()),
    sent: messages.filter((m) => m.status === 'sent'),
    problems: messages.filter((m) => m.status === 'failed' || m.status === 'blocked'),
  }), [messages]);

  const selectedClient = clients.find((c) => c.id === form.clientId);

  const runEnqueue = async () => {
    setBusy(true);
    try {
      const n = await enqueueDueReminders();
      toast({ title: l(`${n} reminders queued`, `${n} recordatorios en cola`) });
      await load();
    } catch (e: any) {
      toast({ title: l('Could not queue reminders', 'No se pudo generar la cola'), description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const createReminder = async () => {
    if (!form.clientId || !form.instruction.trim()) return;
    setBusy(true);
    try {
      const contact = contacts.find((c) => c.id === form.contactId);
      const project = selectedClient?.projects.find((p) => p.id === form.estateId);
      const { subject, body } = maintenanceReminderMessage(
        form.type,
        {
          projectName: project?.name ?? null,
          instruction: form.instruction.trim(),
          dueDate: form.dueDate || null,
        },
        contact?.preferred_language || language,
      );
      await queueMessage({
        clientId: form.clientId,
        estateId: form.estateId || null,
        contactId: form.contactId || null,
        messageType: form.type,
        channel: form.channel,
        subject,
        body,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      });
      toast({ title: l('Reminder created', 'Recordatorio creado') });
      setCreateOpen(false);
      setForm((f) => ({ ...f, instruction: '', dueDate: '', scheduledAt: '' }));
      await load();
    } catch (e: any) {
      toast({ title: l('Could not create reminder', 'No se pudo crear el recordatorio'), description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<void>, okEn: string, okEs: string) => {
    setBusy(true);
    try {
      await fn();
      toast({ title: l(okEn, okEs) });
      await load();
    } catch (e: any) {
      toast({ title: l('Action failed', 'La acción falló'), description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const openManualSend = (m: OutboxMessage) => {
    const to = m.contact?.email;
    const phone = m.contact?.phone_e164;
    if (m.channel === 'email') {
      if (!to) {
        toast({ title: l('Contact has no email', 'El contacto no tiene correo'), variant: 'destructive' });
        return;
      }
      window.open(mailtoUrl(to, m.subject || '', m.body, m.cc_emails || []), '_blank');
    } else {
      if (!phone) {
        toast({ title: l('Contact has no phone', 'El contacto no tiene teléfono'), variant: 'destructive' });
        return;
      }
      window.open(whatsappUrl(phone, m.body), '_blank');
    }
  };

  const typeLabel = (t: MessageType) =>
    language === 'es' ? MESSAGE_TYPE_LABELS[t].es : language === 'de' ? MESSAGE_TYPE_LABELS[t].de : MESSAGE_TYPE_LABELS[t].en;


  const toggleWatering = async (row: CareQueueRow, enabled: boolean) => {
    setWateringFlags((prev) => ({ ...prev, [row.placement_id]: enabled }));
    try {
      await setWaterReminders(row.placement_id, enabled);
    } catch (e: any) {
      setWateringFlags((prev) => ({ ...prev, [row.placement_id]: !enabled }));
      toast({ title: l('Could not update the reminder', 'No se pudo actualizar el recordatorio'), description: e.message, variant: 'destructive' });
    }
  };

  const wateringList = () => (
    <div className="space-y-3">
      {wateringRows.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {l('No plants installed yet.', 'Todavía no hay plantas instaladas.', 'Noch keine Pflanzen installiert.')}
        </p>
      )}
      {wateringRows.map((r) => {
        const on = wateringFlags[r.placement_id] !== false;
        return (
          <Card key={r.placement_id}>
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={r.care_state === 'regar' ? 'default' : r.care_state === 'revisar' ? 'destructive' : 'secondary'}>
                    {r.care_state === 'regar'
                      ? l('Water today', 'Regar hoy', 'Heute gießen')
                      : r.care_state === 'revisar'
                        ? l('Review', 'Revisar', 'Prüfen')
                        : l('Do not water', 'No regar', 'Nicht gießen')}
                  </Badge>
                  {r.effective_days != null && (
                    <Badge variant="outline">{l('every', 'cada', 'alle')} {r.effective_days} {l('days', 'días', 'Tage')}</Badge>
                  )}
                </div>
                <p className="text-sm font-medium mt-2 truncate">{r.plant_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[r.estate_name, r.zone_name, r.spot_label].filter(Boolean).join(' · ') || '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {l('Next watering', 'Próximo riego', 'Nächstes Gießen')}: {r.next_water_due ? new Date(r.next_water_due).toLocaleDateString() : '—'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Switch checked={on} onCheckedChange={(v) => toggleWatering(r, v)} />
                <span className="text-[11px] text-muted-foreground">
                  {on ? l('Reminders on', 'Recordatorios activos', 'Erinnerungen an') : l('Reminders off', 'Sin recordatorios', 'Erinnerungen aus')}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const list = (rows: OutboxMessage[], showSend: boolean) => (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {l('Nothing here.', 'Nada por aquí.', 'Nichts hier.')}
        </p>
      )}
      {rows.map((m) => (
        <Card key={m.id}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{typeLabel(m.message_type)}</Badge>
                  <Badge variant="outline" className="gap-1">
                    {m.channel === 'email' ? <Mail className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
                    {m.channel === 'email' ? l('Email', 'Correo', 'E-Mail') : 'WhatsApp'}
                  </Badge>
                  {m.send_mode === 'automatic' && <Badge variant="outline">{l('Automatic', 'Automático', 'Automatisch')}</Badge>}
                </div>
                <p className="text-sm font-medium mt-2 truncate">
                  {m.client?.name || '—'}
                  {m.estate?.name ? ` · ${m.estate.name}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.contact?.name || l('No contact selected', 'Sin contacto seleccionado', 'Kein Kontakt gewählt')}
                  {m.scheduled_at ? ` · ${new Date(m.scheduled_at).toLocaleString()}` : ''}
                </p>
              </div>
            </div>
            {m.subject && <p className="text-sm font-medium">{m.subject}</p>}
            <pre className="text-xs whitespace-pre-wrap text-muted-foreground font-sans">{m.body}</pre>
            {m.last_error && <p className="text-xs text-destructive">{m.last_error}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              {showSend && (
                <>
                  <Button size="sm" variant="outline" onClick={() => openManualSend(m)} disabled={busy}>
                    {m.channel === 'email' ? <Mail className="h-4 w-4 mr-1" /> : <MessageCircle className="h-4 w-4 mr-1" />}
                    {l('Open to send', 'Abrir para enviar', 'Zum Senden öffnen')}
                  </Button>
                  <Button size="sm" onClick={() => act(() => markMessageSent(m.id), 'Marked as sent', 'Marcado como enviado')} disabled={busy}>
                    <Check className="h-4 w-4 mr-1" />
                    {l('Mark as sent', 'Marcar como enviado', 'Als gesendet markieren')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => act(() => cancelMessage(m.id), 'Cancelled', 'Cancelado')} disabled={busy}>
                    <X className="h-4 w-4 mr-1" />
                    {l('Cancel', 'Cancelar', 'Abbrechen')}
                  </Button>
                </>
              )}
              {(m.status === 'failed' || m.status === 'blocked') && (
                <Button size="sm" variant="outline" onClick={() => act(() => retryMessage(m.id), 'Queued again', 'Nuevamente en cola')} disabled={busy}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {l('Retry', 'Reintentar', 'Wiederholen')}
                </Button>
              )}
              {m.status === 'sent' && m.sent_at && (
                <span className="text-xs text-muted-foreground self-center">
                  {l('Sent', 'Enviado', 'Gesendet')} {new Date(m.sent_at).toLocaleString()}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (!isEnabled('reminders')) {
    return (
      <ModernAppLayout>
        <main className="p-4 max-w-3xl mx-auto safe-area-content">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l('Reminders module is off', 'El módulo de recordatorios está desactivado', 'Erinnerungsmodul ist aus')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {l('Enable it in PlantOps settings to use client reminders.',
                 'Actívelo en la configuración de PlantOps para usar recordatorios al cliente.',
                 'Aktivieren Sie es in den PlantOps-Einstellungen.')}
            </CardContent>
          </Card>
        </main>
      </ModernAppLayout>
    );
  }

  return (
    <ModernAppLayout>
      <main className="p-4 space-y-4 max-w-4xl mx-auto safe-area-content">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <BellRing className="h-6 w-6 text-primary" />
              {l('Reminders', 'Recordatorios', 'Erinnerungen')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {l('Everything the client must be told, with an auditable send record.',
                 'Todo lo que el cliente debe saber, con registro de envío auditable.',
                 'Alles, was der Kunde wissen muss, mit nachvollziehbarem Sendeprotokoll.')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={runEnqueue} disabled={busy}>
              <RefreshCw className="h-4 w-4 mr-1" />
              {l('Generate due', 'Generar pendientes', 'Fällige erzeugen')}
            </Button>
            <Button onClick={() => setCreateOpen(true)} disabled={clients.length === 0}>
              <Plus className="h-4 w-4 mr-1" />
              {l('New reminder', 'Nuevo recordatorio', 'Neue Erinnerung')}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Tabs defaultValue="watering">
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="watering" className="gap-1">
                <Droplets className="h-3.5 w-3.5" />
                {l('Watering', 'Riego', 'Gießen')}
              </TabsTrigger>
              <TabsTrigger value="due">{l('Due', 'Pendientes', 'Fällig')} ({groups.due.length})</TabsTrigger>
              <TabsTrigger value="scheduled">{l('Scheduled', 'Programados', 'Geplant')} ({groups.scheduled.length})</TabsTrigger>
              <TabsTrigger value="sent">{l('Sent', 'Enviados', 'Gesendet')} ({groups.sent.length})</TabsTrigger>
              <TabsTrigger value="problems">{l('Problems', 'Problemas', 'Probleme')} ({groups.problems.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="watering" className="mt-4">{wateringList()}</TabsContent>
            <TabsContent value="due" className="mt-4">{list(groups.due, true)}</TabsContent>
            <TabsContent value="scheduled" className="mt-4">{list(groups.scheduled, true)}</TabsContent>
            <TabsContent value="sent" className="mt-4">{list(groups.sent, false)}</TabsContent>
            <TabsContent value="problems" className="mt-4">{list(groups.problems, true)}</TabsContent>
          </Tabs>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{l('New reminder', 'Nuevo recordatorio', 'Neue Erinnerung')}</DialogTitle>
              <DialogDescription>
                {l('Custom maintenance reminders: light checks, fertilization, pruning, cleaning, rotation or replacement.',
                   'Recordatorios de mantenimiento: revisión de luz, fertilización, poda, limpieza, rotación o reemplazo.',
                   'Wartungserinnerungen: Licht, Düngung, Rückschnitt, Reinigung, Rotation oder Ersatz.')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{l('Client', 'Cliente', 'Kunde')}</Label>
                <Select value={form.clientId} onValueChange={(v) => setForm((f) => ({ ...f, clientId: v, estateId: '', contactId: '' }))}>
                  <SelectTrigger><SelectValue placeholder={l('Select a client', 'Seleccione un cliente', 'Kunde wählen')} /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {selectedClient && selectedClient.projects.length > 0 && (
                <div className="space-y-1">
                  <Label>{l('Project', 'Proyecto', 'Projekt')}</Label>
                  <Select value={form.estateId} onValueChange={(v) => setForm((f) => ({ ...f, estateId: v }))}>
                    <SelectTrigger><SelectValue placeholder={l('Optional', 'Opcional', 'Optional')} /></SelectTrigger>
                    <SelectContent>
                      {selectedClient.projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <Label>{l('Contact', 'Contacto', 'Kontakt')}</Label>
                <Select value={form.contactId} onValueChange={(v) => setForm((f) => ({ ...f, contactId: v }))}>
                  <SelectTrigger><SelectValue placeholder={l('Select a contact', 'Seleccione un contacto', 'Kontakt wählen')} /></SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{l('Type', 'Tipo', 'Typ')}</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as MessageType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CUSTOM_REMINDER_TYPES.map((t) => <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{l('Channel', 'Canal', 'Kanal')}</Label>
                  <Select value={form.channel} onValueChange={(v) => setForm((f) => ({ ...f, channel: v as 'email' | 'whatsapp' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">{l('Email', 'Correo', 'E-Mail')}</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{l('Action date', 'Fecha de la acción', 'Datum der Aktion')}</Label>
                  <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>{l('Send at', 'Enviar el', 'Senden am')}</Label>
                  <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1">
                <Label>{l('Instruction for the client', 'Instrucción para el cliente', 'Anweisung für den Kunden')}</Label>
                <Textarea
                  rows={4}
                  value={form.instruction}
                  onChange={(e) => setForm((f) => ({ ...f, instruction: e.target.value }))}
                  placeholder={l('Exactly what to do, with amounts if needed.',
                                 'Exactamente qué hacer, con cantidades si aplica.',
                                 'Genau was zu tun ist, mit Mengen falls nötig.')}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>{l('Cancel', 'Cancelar', 'Abbrechen')}</Button>
              <Button onClick={createReminder} disabled={busy || !form.clientId || !form.instruction.trim()}>
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {l('Create', 'Crear', 'Erstellen')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </ModernAppLayout>
  );
}
