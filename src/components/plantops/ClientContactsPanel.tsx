import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, UserMinus, Mail, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  fetchClientContacts,
  createClientContact,
  updateClientContact,
  deactivateClientContact,
  normalizePhone,
  type ClientContact,
  type ContactChannel,
} from '@/lib/plantopsComms';

interface Props {
  orgId: string;
  clientId: string;
}

const emptyForm = {
  name: '',
  role_label: '',
  email: '',
  phone_e164: '',
  preferred_language: 'es',
  is_primary: false,
  receive_care_reminders: true,
  receive_visit_summaries: false,
  receive_invoices: false,
  email_channel: true,
  whatsapp_channel: false,
  cc_emails: '',
};

/** Multiple contacts per client: who receives what, in which language and channel. */
export function ClientContactsPanel({ orgId, clientId }: Props) {
  const { toast } = useToast();
  const { tl } = useLanguage();
  const l = (en: string, es: string) => tl({ en, es, de: en });

  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientContact | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setContacts(await fetchClientContacts(clientId));
    } catch (e: any) {
      toast({ title: l('Could not load contacts', 'No se pudieron cargar los contactos'), description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [clientId]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (c: ClientContact) => {
    setEditing(c);
    setForm({
      name: c.name,
      role_label: c.role_label ?? '',
      email: c.email ?? '',
      phone_e164: c.phone_e164 ?? '',
      preferred_language: c.preferred_language,
      is_primary: c.is_primary,
      receive_care_reminders: c.receive_care_reminders,
      receive_visit_summaries: c.receive_visit_summaries,
      receive_invoices: c.receive_invoices,
      email_channel: (c.preferred_channels || []).includes('email'),
      whatsapp_channel: (c.preferred_channels || []).includes('whatsapp'),
      cc_emails: (c.cc_emails || []).join(', '),
    });
    setOpen(true);
  };

  const save = async () => {
    const channels: ContactChannel[] = [];
    if (form.email_channel) channels.push('email');
    if (form.whatsapp_channel) channels.push('whatsapp');

    if (form.email_channel && !form.email.trim()) {
      toast({ title: l('Email channel needs an email address', 'El canal de correo requiere un correo'), variant: 'destructive' });
      return;
    }
    if (form.whatsapp_channel && !normalizePhone(form.phone_e164)) {
      toast({ title: l('WhatsApp needs a phone in +country format', 'WhatsApp requiere un teléfono con +país'), variant: 'destructive' });
      return;
    }
    if (form.phone_e164.trim() && !normalizePhone(form.phone_e164)) {
      toast({ title: l('Invalid phone number', 'Teléfono inválido'), variant: 'destructive' });
      return;
    }

    const payload = {
      name: form.name.trim(),
      role_label: form.role_label.trim() || null,
      email: form.email.trim() || null,
      phone_e164: form.phone_e164.trim() || null,
      preferred_language: form.preferred_language,
      is_primary: form.is_primary,
      is_active: true,
      receive_care_reminders: form.receive_care_reminders,
      receive_visit_summaries: form.receive_visit_summaries,
      receive_invoices: form.receive_invoices,
      preferred_channels: channels,
      cc_emails: form.cc_emails.split(',').map((s) => s.trim()).filter(Boolean),
    };

    setSaving(true);
    try {
      if (editing) await updateClientContact(editing.id, payload);
      else await createClientContact(orgId, clientId, payload);
      setOpen(false);
      await load();
      toast({ title: l('Contact saved', 'Contacto guardado') });
    } catch (e: any) {
      toast({ title: l('Could not save', 'No se pudo guardar'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (c: ClientContact) => {
    try {
      await deactivateClientContact(c.id);
      await load();
      toast({ title: l('Contact deactivated', 'Contacto desactivado') });
    } catch (e: any) {
      toast({ title: l('Could not update', 'No se pudo actualizar'), description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {l(
            'Clients never need an account: contacts receive links and reminders.',
            'El cliente no necesita cuenta: los contactos reciben enlaces y recordatorios.',
          )}
        </p>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />{l('Add contact', 'Agregar contacto')}</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : contacts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
          {l('No contacts yet', 'Aún no hay contactos')}
        </CardContent></Card>
      ) : (
        contacts.map((c) => (
          <Card key={c.id} className={c.is_active ? '' : 'opacity-60'}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-medium">
                    {c.name}{' '}
                    {c.is_primary && <Badge variant="default" className="ml-1">{l('Primary', 'Principal')}</Badge>}
                    {!c.is_active && <Badge variant="secondary" className="ml-1">{l('Inactive', 'Inactivo')}</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[c.role_label, c.email, c.phone_e164].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  {c.is_active && (
                    <Button size="sm" variant="ghost" onClick={() => deactivate(c)}><UserMinus className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge variant="outline">{c.preferred_language.toUpperCase()}</Badge>
                {(c.preferred_channels || []).includes('email') && (
                  <Badge variant="secondary"><Mail className="h-3 w-3 mr-1" />{l('Email', 'Correo')}</Badge>
                )}
                {(c.preferred_channels || []).includes('whatsapp') && (
                  <Badge variant="secondary"><MessageCircle className="h-3 w-3 mr-1" />WhatsApp</Badge>
                )}
                {c.receive_care_reminders && <Badge variant="outline">{l('Care reminders', 'Recordatorios de cuidado')}</Badge>}
                {c.receive_visit_summaries && <Badge variant="outline">{l('Visit summaries', 'Resúmenes de visita')}</Badge>}
                {c.receive_invoices && <Badge variant="outline">{l('Invoices', 'Facturas')}</Badge>}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? l('Edit contact', 'Editar contacto') : l('New contact', 'Nuevo contacto')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{l('Name', 'Nombre')}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{l('Role', 'Rol')}</Label>
              <Input
                value={form.role_label}
                placeholder={l('Administrator, gardener, owner…', 'Administración, jardinero, propietario…')}
                onChange={(e) => setForm({ ...form, role_label: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{l('Email', 'Correo')}</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{l('Phone (+country)', 'Teléfono (+país)')}</Label>
              <Input value={form.phone_e164} placeholder="+50688887777" onChange={(e) => setForm({ ...form, phone_e164: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{l('Language', 'Idioma')}</Label>
              <Select value={form.preferred_language} onValueChange={(v) => setForm({ ...form, preferred_language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{l('CC emails (comma separated)', 'Correos en copia (separados por coma)')}</Label>
              <Input value={form.cc_emails} onChange={(e) => setForm({ ...form, cc_emails: e.target.value })} />
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <div className="text-sm font-medium">{l('Channels', 'Canales')}</div>
              {([
                ['email_channel', l('Email', 'Correo')],
                ['whatsapp_channel', 'WhatsApp'],
              ] as const).map(([k, label]) => (
                <div key={k} className="flex items-center justify-between">
                  <Label className="text-sm">{label}</Label>
                  <Switch checked={(form as any)[k]} onCheckedChange={(v) => setForm({ ...form, [k]: v })} />
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <div className="text-sm font-medium">{l('Receives', 'Recibe')}</div>
              {([
                ['receive_care_reminders', l('Care reminders', 'Recordatorios de cuidado')],
                ['receive_visit_summaries', l('Visit summaries', 'Resúmenes de visita')],
                ['receive_invoices', l('Invoices', 'Facturas')],
                ['is_primary', l('Primary contact', 'Contacto principal')],
              ] as const).map(([k, label]) => (
                <div key={k} className="flex items-center justify-between">
                  <Label className="text-sm">{label}</Label>
                  <Switch checked={(form as any)[k]} onCheckedChange={(v) => setForm({ ...form, [k]: v })} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{l('Cancel', 'Cancelar')}</Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Save', 'Guardar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
