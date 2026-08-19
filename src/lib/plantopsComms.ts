import { supabase } from '@/integrations/supabase/client';
import { fetchServicePlan, saveServicePlan } from '@/lib/plantopsProperty';

/**
 * Client contacts, communications outbox and the aggregated client portal.
 *
 * Sending never depends on a paid provider: every queued message can be sent
 * manually by the operator through mailto/WhatsApp deep links and then marked
 * as sent. Automatic dispatch is optional and additive.
 */

/* ---------------------------- contacts ---------------------------- */

export type ContactChannel = 'email' | 'whatsapp';

export interface ClientContact {
  id: string;
  org_id: string;
  client_id: string;
  name: string;
  role_label: string | null;
  email: string | null;
  phone_e164: string | null;
  preferred_language: string;
  is_primary: boolean;
  is_active: boolean;
  receive_care_reminders: boolean;
  receive_visit_summaries: boolean;
  receive_invoices: boolean;
  preferred_channels: ContactChannel[];
  cc_emails: string[];
}

export interface ContactInput {
  name: string;
  role_label?: string | null;
  email?: string | null;
  phone_e164?: string | null;
  preferred_language?: string;
  is_primary?: boolean;
  is_active?: boolean;
  receive_care_reminders?: boolean;
  receive_visit_summaries?: boolean;
  receive_invoices?: boolean;
  preferred_channels?: ContactChannel[];
  cc_emails?: string[];
}

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return null;
  const withPlus = digits.startsWith('+') ? digits : `+${digits}`;
  return /^\+[1-9]\d{6,14}$/.test(withPlus) ? withPlus : null;
}

/** A contact is reachable on a channel only when the channel data exists. */
export function contactChannels(c: ClientContact): ContactChannel[] {
  return (c.preferred_channels || []).filter((ch) =>
    ch === 'email' ? !!c.email : !!c.phone_e164,
  );
}

export async function fetchClientContacts(clientId: string): Promise<ClientContact[]> {
  const { data, error } = await supabase
    .from('client_contacts' as any)
    .select('*')
    .eq('client_id', clientId)
    .order('is_primary', { ascending: false })
    .order('name');
  if (error) throw error;
  return ((data as any[]) || []) as ClientContact[];
}

export async function createClientContact(orgId: string, clientId: string, input: ContactInput) {
  const { error } = await supabase.from('client_contacts' as any).insert({
    org_id: orgId,
    client_id: clientId,
    name: input.name,
    role_label: input.role_label ?? null,
    email: input.email || null,
    phone_e164: normalizePhone(input.phone_e164),
    preferred_language: input.preferred_language ?? 'es',
    is_primary: input.is_primary ?? false,
    is_active: input.is_active ?? true,
    receive_care_reminders: input.receive_care_reminders ?? true,
    receive_visit_summaries: input.receive_visit_summaries ?? false,
    receive_invoices: input.receive_invoices ?? false,
    preferred_channels: input.preferred_channels ?? [],
    cc_emails: input.cc_emails ?? [],
  } as any);
  if (error) throw error;
}

export async function updateClientContact(contactId: string, input: ContactInput) {
  const { error } = await supabase
    .from('client_contacts' as any)
    .update({
      name: input.name,
      role_label: input.role_label ?? null,
      email: input.email || null,
      phone_e164: normalizePhone(input.phone_e164),
      preferred_language: input.preferred_language ?? 'es',
      is_primary: input.is_primary ?? false,
      is_active: input.is_active ?? true,
      receive_care_reminders: input.receive_care_reminders ?? true,
      receive_visit_summaries: input.receive_visit_summaries ?? false,
      receive_invoices: input.receive_invoices ?? false,
      preferred_channels: input.preferred_channels ?? [],
      cc_emails: input.cc_emails ?? [],
    } as any)
    .eq('id', contactId);
  if (error) throw error;
}

export async function deactivateClientContact(contactId: string) {
  const { error } = await supabase
    .from('client_contacts' as any)
    .update({ is_active: false, preferred_channels: [] } as any)
    .eq('id', contactId);
  if (error) throw error;
}

/* --------------------------- reminders ---------------------------- */

export interface ReminderSettings {
  mode: 'manual' | 'automatic';
  send_time: string;
  timezone: string;
  channels: ContactChannel[];
  include_amount: boolean;
  include_do_not_water: boolean;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  mode: 'manual',
  send_time: '08:00',
  timezone: 'America/Costa_Rica',
  channels: ['email'],
  include_amount: true,
  include_do_not_water: true,
};

export async function fetchReminderSettings(estateId: string): Promise<ReminderSettings> {
  const plan = await fetchServicePlan(estateId);
  return { ...DEFAULT_REMINDER_SETTINGS, ...((plan as any).reminder_settings || {}) };
}

export async function saveReminderSettings(estateId: string, settings: ReminderSettings) {
  const plan = await fetchServicePlan(estateId);
  await saveServicePlan(estateId, { ...plan, reminder_settings: settings } as any);
}

/* ----------------------------- outbox ----------------------------- */

export const MESSAGE_TYPES = [
  'watering_due',
  'watering_completed',
  'do_not_water',
  'care_issue',
  'visit_reminder',
  'visit_summary',
  'manual_ready',
  'invoice_sent',
  'invoice_overdue',
  'light_check',
  'fertilization',
  'pruning',
  'cleaning',
  'rotation',
  'replacement',
  'custom',
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

/** Reminder kinds the operator can create by hand (watering is engine-driven). */
export const CUSTOM_REMINDER_TYPES: MessageType[] = [
  'light_check',
  'fertilization',
  'pruning',
  'cleaning',
  'rotation',
  'replacement',
  'visit_reminder',
  'custom',
];

export const MESSAGE_TYPE_LABELS: Record<MessageType, { en: string; es: string; de: string }> = {
  watering_due: { en: 'Watering due', es: 'Riego pendiente', de: 'Gießen fällig' },
  watering_completed: { en: 'Watering completed', es: 'Riego realizado', de: 'Gießen erledigt' },
  do_not_water: { en: 'Do not water', es: 'No regar', de: 'Nicht gießen' },
  care_issue: { en: 'Care issue', es: 'Problema de cuidado', de: 'Pflegeproblem' },
  visit_reminder: { en: 'Visit reminder', es: 'Recordatorio de visita', de: 'Besuchserinnerung' },
  visit_summary: { en: 'Visit summary', es: 'Resumen de visita', de: 'Besuchsbericht' },
  manual_ready: { en: 'Manual ready', es: 'Manual listo', de: 'Handbuch bereit' },
  invoice_sent: { en: 'Invoice sent', es: 'Factura enviada', de: 'Rechnung gesendet' },
  invoice_overdue: { en: 'Invoice overdue', es: 'Factura vencida', de: 'Rechnung überfällig' },
  light_check: { en: 'Light check', es: 'Revisión de luz', de: 'Lichtkontrolle' },
  fertilization: { en: 'Fertilization', es: 'Fertilización', de: 'Düngung' },
  pruning: { en: 'Pruning', es: 'Poda', de: 'Rückschnitt' },
  cleaning: { en: 'Leaf cleaning', es: 'Limpieza de hojas', de: 'Blattreinigung' },
  rotation: { en: 'Rotation', es: 'Rotación', de: 'Rotation' },
  replacement: { en: 'Replacement', es: 'Reemplazo', de: 'Ersatz' },
  custom: { en: 'Custom message', es: 'Mensaje personalizado', de: 'Eigene Nachricht' },
};


export type MessageStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'blocked' | 'cancelled';

export interface OutboxMessage {
  id: string;
  client_id: string;
  estate_id: string | null;
  contact_id: string | null;
  placement_id: string | null;
  message_type: MessageType;
  channel: ContactChannel;
  send_mode: 'manual' | 'automatic';
  subject: string | null;
  body: string;
  cc_emails: string[];
  scheduled_at: string | null;
  status: MessageStatus;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
  contact?: { name: string; email: string | null; phone_e164: string | null } | null;
  estate?: { name: string | null } | null;
}

export async function fetchOutbox(clientId: string, limit = 100): Promise<OutboxMessage[]> {
  const { data, error } = await supabase
    .from('client_message_outbox' as any)
    .select('*, contact:client_contacts(name, email, phone_e164), estate:estates(name)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data as any[]) || []) as OutboxMessage[];
}

export interface QueueMessageInput {
  clientId: string;
  messageType: MessageType;
  channel: ContactChannel;
  body: string;
  subject?: string | null;
  estateId?: string | null;
  contactId?: string | null;
  placementId?: string | null;
  ccEmails?: string[];
  idempotencyKey?: string | null;
}

export async function queueMessage(input: QueueMessageInput): Promise<string> {
  const { data, error } = await supabase.rpc('plantops_queue_message' as any, {
    p_client_id: input.clientId,
    p_message_type: input.messageType,
    p_channel: input.channel,
    p_body: input.body,
    p_subject: input.subject ?? null,
    p_estate_id: input.estateId ?? null,
    p_contact_id: input.contactId ?? null,
    p_placement_id: input.placementId ?? null,
    p_cc_emails: input.ccEmails ?? [],
    p_scheduled_at: null,
    p_idempotency_key: input.idempotencyKey ?? null,
    p_send_mode: 'manual',
  } as any);
  if (error) throw error;
  return data as string;
}

export async function markMessageSent(id: string) {
  const { error } = await supabase.rpc('plantops_mark_message_sent' as any, { p_message_id: id } as any);
  if (error) throw error;
}

export async function cancelMessage(id: string) {
  const { error } = await supabase.rpc('plantops_cancel_message' as any, { p_message_id: id } as any);
  if (error) throw error;
}

export async function retryMessage(id: string) {
  const { error } = await supabase.rpc('plantops_retry_message' as any, { p_message_id: id } as any);
  if (error) throw error;
}

/* --------------------- manual send deep links --------------------- */

export function mailtoUrl(to: string, subject: string, body: string, cc: string[] = []) {
  const params = new URLSearchParams();
  params.set('subject', subject);
  params.set('body', body);
  if (cc.length) params.set('cc', cc.join(','));
  return `mailto:${encodeURIComponent(to)}?${params.toString().replace(/\+/g, '%20')}`;
}

export function whatsappUrl(phoneE164: string, body: string) {
  return `https://wa.me/${phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(body)}`;
}

/* ---------------------- message content ------------------------- */

interface WateringContext {
  plantName: string;
  projectName: string;
  location?: string | null;
  amountNote?: string | null;
  nextDue?: string | null;
}

const L = (lang: string) => (lang === 'en' ? 'en' : lang === 'de' ? 'de' : 'es');

/** "You may water today" — always paired with the stop instruction. */
export function wateringDueMessage(ctx: WateringContext, lang: string) {
  const l = L(lang);
  const where = [ctx.projectName, ctx.location].filter(Boolean).join(' · ');
  if (l === 'en') {
    return {
      subject: `You may water today: ${ctx.plantName}`,
      body: [
        'YOU MAY WATER TODAY',
        '',
        ctx.plantName,
        where,
        '',
        'Amount:',
        ctx.amountNote || 'as indicated',
        '',
        'After watering it, do not water it again until you receive the next notice.',
      ].join('\n'),
    };
  }
  if (l === 'de') {
    return {
      subject: `Heute darf gegossen werden: ${ctx.plantName}`,
      body: [
        'HEUTE GIESSEN ERLAUBT',
        '',
        ctx.plantName,
        where,
        '',
        'Menge:',
        ctx.amountNote || 'wie angegeben',
        '',
        'Nach dem Gießen bitte erst beim nächsten Hinweis wieder gießen.',
      ].join('\n'),
    };
  }
  return {
    subject: `Puede regar hoy: ${ctx.plantName}`,
    body: [
      'PUEDE REGAR HOY',
      '',
      ctx.plantName,
      where,
      '',
      'Cantidad:',
      ctx.amountNote || 'según indicación',
      '',
      'Después de regarla, no vuelva a regarla hasta recibir el próximo aviso.',
    ].join('\n'),
  };
}

/** "Do not water before <date>" — never a vague "water when dry". */
export function doNotWaterMessage(ctx: WateringContext, lang: string) {
  const l = L(lang);
  const where = [ctx.projectName, ctx.location].filter(Boolean).join(' · ');
  const date = ctx.nextDue || '';
  if (l === 'en') {
    return {
      subject: `Do not water before ${date}: ${ctx.plantName}`,
      body: [`DO NOT WATER BEFORE ${date}`, '', ctx.plantName, where, '', 'We will let you know when it is time.'].join('\n'),
    };
  }
  if (l === 'de') {
    return {
      subject: `Nicht gießen vor ${date}: ${ctx.plantName}`,
      body: [`NICHT GIESSEN VOR ${date}`, '', ctx.plantName, where, '', 'Wir melden uns, sobald es Zeit ist.'].join('\n'),
    };
  }
  return {
    subject: `No regar antes del ${date}: ${ctx.plantName}`,
    body: [`NO REGAR ANTES DEL ${date}`, '', ctx.plantName, where, '', 'Le avisamos cuando corresponda.'].join('\n'),
  };
}

/* --------------------- aggregated client portal ------------------- */

export interface ClientPortalLink {
  id: string;
  client_id: string;
  show_projects: boolean;
  show_plants: boolean;
  show_care: boolean;
  show_manuals: boolean;
  show_visits: boolean;
  show_invoices: boolean;
  show_documents: boolean;
  contact_note: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export const PORTAL_TOGGLES = [
  'show_projects',
  'show_plants',
  'show_care',
  'show_manuals',
  'show_visits',
  'show_invoices',
  'show_documents',
] as const;

export const PORTAL_TOGGLE_LABELS: Record<string, { en: string; es: string }> = {
  show_projects: { en: 'Projects', es: 'Proyectos' },
  show_plants: { en: 'Plants', es: 'Plantas' },
  show_care: { en: 'Care instructions', es: 'Instrucciones de cuidado' },
  show_manuals: { en: 'Approved manuals', es: 'Manuales aprobados' },
  show_visits: { en: 'Visit activity', es: 'Actividad de visitas' },
  show_invoices: { en: 'Invoices', es: 'Facturas' },
  show_documents: { en: 'Documents', es: 'Documentos' },
};

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function newToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function fetchClientPortalLink(clientId: string): Promise<ClientPortalLink | null> {
  const { data, error } = await supabase
    .from('client_portal_links' as any)
    .select('*')
    .eq('client_id', clientId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as any) ?? null;
}

/** Returns the clear token exactly once — only the hash is stored. */
export async function createClientPortalLink(
  clientId: string,
  toggles: Partial<Record<(typeof PORTAL_TOGGLES)[number], boolean>>,
  contactNote?: string | null,
  expiresAt?: string | null,
): Promise<string> {
  const token = newToken();
  const { error } = await supabase.rpc('plantops_create_client_portal_link' as any, {
    p_client_id: clientId,
    p_token_hash: await sha256Hex(token),
    p_show_projects: toggles.show_projects ?? true,
    p_show_plants: toggles.show_plants ?? true,
    p_show_care: toggles.show_care ?? true,
    p_show_manuals: toggles.show_manuals ?? true,
    p_show_visits: toggles.show_visits ?? true,
    p_show_invoices: toggles.show_invoices ?? false,
    p_show_documents: toggles.show_documents ?? false,
    p_contact_note: contactNote ?? null,
    p_expires_at: expiresAt ?? null,
  } as any);
  if (error) throw error;
  return token;
}

/** Rotation copies the visibility settings verbatim and revokes the old token. */
export async function rotateClientPortalLink(linkId: string): Promise<string> {
  const token = newToken();
  const { error } = await supabase.rpc('plantops_rotate_client_portal_link' as any, {
    p_link_id: linkId,
    p_token_hash: await sha256Hex(token),
  } as any);
  if (error) throw error;
  return token;
}

export async function updateClientPortalLink(link: ClientPortalLink) {
  const { error } = await supabase.rpc('plantops_update_client_portal_link' as any, {
    p_link_id: link.id,
    p_show_projects: link.show_projects,
    p_show_plants: link.show_plants,
    p_show_care: link.show_care,
    p_show_manuals: link.show_manuals,
    p_show_visits: link.show_visits,
    p_show_invoices: link.show_invoices,
    p_show_documents: link.show_documents,
    p_contact_note: link.contact_note,
    p_expires_at: link.expires_at,
  } as any);
  if (error) throw error;
}

export async function revokeClientPortalLink(linkId: string) {
  const { error } = await supabase.rpc('plantops_revoke_client_portal_link' as any, { p_link_id: linkId } as any);
  if (error) throw error;
}
