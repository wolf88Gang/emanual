import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, MessageCircle, Check, X, RotateCcw, Send, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  fetchOutbox,
  fetchClientContacts,
  queueMessage,
  markMessageSent,
  cancelMessage,
  retryMessage,
  mailtoUrl,
  whatsappUrl,
  contactChannels,
  type OutboxMessage,
  type ClientContact,
  type ContactChannel,
} from '@/lib/plantopsComms';

interface Props {
  clientId: string;
  projects: { id: string; name: string }[];
}

/**
 * Communications inbox/outbox. Sending never requires a paid provider: the
 * operator opens the prefilled email or WhatsApp message and then marks it sent,
 * which keeps an auditable history.
 */
export function ClientOutboxPanel({ clientId, projects }: Props) {
  const { toast } = useToast();
  const { tl } = useLanguage();
  const l = (en: string, es: string) => tl({ en, es, de: en });

  const [messages, setMessages] = useState<OutboxMessage[]>([]);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contactId: '',
    estateId: '',
    channel: 'email' as ContactChannel,
    subject: '',
    body: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [m, c] = await Promise.all([fetchOutbox(clientId), fetchClientContacts(clientId)]);
      setMessages(m);
      setContacts(c);
    } catch (e: any) {
      toast({ title: l('Could not load communications', 'No se pudieron cargar las comunicaciones'), description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [clientId]);

  const activeContacts = useMemo(() => contacts.filter((c) => c.is_active), [contacts]);
  const selectedContact = activeContacts.find((c) => c.id === form.contactId) || null;

  const statusVariant = (s: OutboxMessage['status']) =>
    s === 'sent' ? 'default' : s === 'failed' || s === 'blocked' ? 'destructive' : 'secondary';

  const openSend = (m: OutboxMessage) => {
    const c = m.contact;
    if (m.channel === 'email') {
      if (!c?.email) {
        toast({ title: l('This contact has no email', 'Este contacto no tiene correo'), variant: 'destructive' });
        return;
      }
      window.open(mailtoUrl(c.email, m.subject ?? '', m.body, m.cc_emails || []), '_blank');
    } else {
      if (!c?.phone_e164) {
        toast({ title: l('This contact has no phone', 'Este contacto no tiene teléfono'), variant: 'destructive' });
        return;
      }
      window.open(whatsappUrl(c.phone_e164, m.body), '_blank');
    }
  };

  const act = async (id: string, fn: (id: string) => Promise<void>) => {
    setBusy(id);
    try {
      await fn(id);
      await load();
    } catch (e: any) {
      toast({ title: l('Action failed', 'No se pudo completar'), description: e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const createMessage = async () => {
    if (!form.contactId || !form.body.trim()) return;
    setSaving(true);
    try {
      await queueMessage({
        clientId,
        contactId: form.contactId,
        estateId: form.estateId || null,
        channel: form.channel,
        messageType: 'custom',
        subject: form.channel === 'email' ? form.subject.trim() || null : null,
        body: form.body.trim(),
        ccEmails: selectedContact?.cc_emails ?? [],
      });
      setOpen(false);
      setForm({ contactId: '', estateId: '', channel: 'email', subject: '', body: '' });
      await load();
      toast({ title: l('Message queued', 'Mensaje en cola') });
    } catch (e: any) {
      toast({ title: l('Could not queue', 'No se pudo poner en cola'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {l('Every message is logged, whether sent manually or automatically.', 'Todo mensaje queda registrado, sea manual o automático.')}
        </p>
        <Button size="sm" onClick={() => setOpen(true)} disabled={activeContacts.length === 0}>
          <Plus className="h-4 w-4 mr-1" />{l('New message', 'Nuevo mensaje')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : messages.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
          {l('No communications yet', 'Aún no hay comunicaciones')}
        </CardContent></Card>
      ) : (
        messages.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    {m.channel === 'email' ? <Mail className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                    {m.subject || m.message_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[m.contact?.name, m.estate?.name, new Date(m.created_at).toLocaleString()].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline">{m.send_mode === 'automatic' ? l('Auto', 'Auto') : l('Manual', 'Manual')}</Badge>
                  <Badge variant={statusVariant(m.status) as any}>{m.status}</Badge>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{m.body}</p>
              {m.last_error && <p className="text-xs text-destructive">{m.last_error}</p>}
              {m.status !== 'sent' && m.status !== 'cancelled' && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openSend(m)}>
                    <Send className="h-3.5 w-3.5 mr-1" />{l('Open to send', 'Abrir para enviar')}
                  </Button>
                  <Button size="sm" disabled={busy === m.id} onClick={() => act(m.id, markMessageSent)}>
                    <Check className="h-3.5 w-3.5 mr-1" />{l('Mark as sent', 'Marcar enviado')}
                  </Button>
                  {(m.status === 'failed' || m.status === 'blocked') && (
                    <Button size="sm" variant="outline" disabled={busy === m.id} onClick={() => act(m.id, retryMessage)}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />{l('Retry', 'Reintentar')}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={busy === m.id} onClick={() => act(m.id, cancelMessage)}>
                    <X className="h-3.5 w-3.5 mr-1" />{l('Cancel', 'Cancelar')}
                  </Button>
                </div>
              )}
              {m.sent_at && (
                <p className="text-xs text-muted-foreground">
                  {l('Sent', 'Enviado')}: {new Date(m.sent_at).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{l('New message', 'Nuevo mensaje')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{l('Contact', 'Contacto')}</Label>
              <Select value={form.contactId} onValueChange={(v) => {
                const c = activeContacts.find((x) => x.id === v);
                const ch = c ? contactChannels(c)[0] ?? 'email' : 'email';
                setForm({ ...form, contactId: v, channel: ch });
              }}>
                <SelectTrigger><SelectValue placeholder={l('Select a contact', 'Seleccione un contacto')} /></SelectTrigger>
                <SelectContent>
                  {activeContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{l('Project (optional)', 'Proyecto (opcional)')}</Label>
              <Select value={form.estateId || 'none'} onValueChange={(v) => setForm({ ...form, estateId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{l('All projects', 'Todos los proyectos')}</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{l('Channel', 'Canal')}</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as ContactChannel })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email" disabled={!selectedContact?.email}>{l('Email', 'Correo')}</SelectItem>
                  <SelectItem value="whatsapp" disabled={!selectedContact?.phone_e164}>WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.channel === 'email' && (
              <div className="space-y-1">
                <Label>{l('Subject', 'Asunto')}</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </div>
            )}
            <div className="space-y-1">
              <Label>{l('Message', 'Mensaje')}</Label>
              <Textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{l('Cancel', 'Cancelar')}</Button>
            <Button onClick={createMessage} disabled={saving || !form.contactId || !form.body.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Queue message', 'Poner en cola')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
