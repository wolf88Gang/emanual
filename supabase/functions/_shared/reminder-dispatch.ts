import { EmailAPIError } from 'npm:@lovable.dev/email-js@0.1.0'
import { sendTemplateEmail } from './transactional-email-templates/send-email.ts'

export interface OutboxRow {
  id: string
  subject: string | null
  body: string
  channel: string
  status: string
  client_id: string
  cc_emails: string[] | null
  client_contacts?: { email: string | null; name: string | null; preferred_language: string | null } | null
  clients?: { name: string | null } | null
  estates?: { name: string | null } | null
}

export const OUTBOX_SELECT =
  'id, subject, body, channel, status, client_id, cc_emails, client_contacts:contact_id(email, name, preferred_language), clients:client_id(name), estates:estate_id(name)'

export type DispatchResult =
  | { ok: true; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string }

/**
 * Sends one queued email message through Lovable's managed email API and writes
 * the outcome back to the outbox, so the operator always sees a truthful record.
 */
export async function dispatchOutboxEmail(supabase: any, m: OutboxRow): Promise<DispatchResult> {
  if (m.channel !== 'email') {
    return { ok: true, skipped: true, reason: 'not_email' };
  }

  const to = m.client_contacts?.email ?? null;
  if (!to) {
    await supabase
      .from('client_message_outbox')
      .update({ status: 'blocked', last_error: 'Contact has no email address' })
      .eq('id', m.id);
    return { ok: false, error: 'contact_without_email' };
  }

  await supabase.from('client_message_outbox').update({ status: 'sending', last_error: null }).eq('id', m.id);

  try {
    const result = await sendTemplateEmail('client-reminder', to, {
      templateData: {
        subject: m.subject || 'Home Guide',
        bodyText: m.body,
        clientName: m.clients?.name ?? null,
        projectName: m.estates?.name ?? null,
        language: m.client_contacts?.preferred_language ?? 'es',
      },
      idempotencyKey: `client-reminder-${m.id}`,
    });

    if (!result.sent) {
      await supabase
        .from('client_message_outbox')
        .update({ status: 'blocked', last_error: 'Recipient unsubscribed or previously bounced' })
        .eq('id', m.id);
      return { ok: false, error: 'recipient_suppressed' };
    }

    await supabase
      .from('client_message_outbox')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        provider: 'lovable',
        last_error: null,
      })
      .eq('id', m.id);
    return { ok: true };
  } catch (error) {
    const code = error instanceof EmailAPIError ? error.code || String(error.status) : 'unknown';
    const message = error instanceof Error ? error.message : 'Unknown error';
    await supabase
      .from('client_message_outbox')
      .update({ status: 'failed', last_error: `${code}: ${message}`.slice(0, 500) })
      .eq('id', m.id);
    return { ok: false, error: code };
  }
}
