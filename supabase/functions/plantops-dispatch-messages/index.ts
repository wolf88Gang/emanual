import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/**
 * Optional automatic dispatch.
 *
 * 1. Enqueues due client reminders (idempotent, one row per contact/channel/day).
 * 2. Sends queued EMAIL messages when an email provider is configured.
 *    WhatsApp and every message without a provider stay queued, so the operator
 *    can still send them by hand from the communications tab — nothing is lost
 *    and nothing is silently marked as sent.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  try {
    const { data: enqueued, error: enqErr } = await supabase.rpc('plantops_enqueue_due_client_reminders');
    if (enqErr) console.error('enqueue failed', enqErr.message);

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromAddress = Deno.env.get('RESEND_FROM');

    if (!resendKey || !fromAddress) {
      return json({
        enqueued: enqueued ?? 0,
        sent: 0,
        note: 'No email provider configured — messages remain queued for manual sending.',
      });
    }

    const { data: queued } = await supabase
      .from('client_message_outbox')
      .select('id, subject, body, cc_emails, contact_id, client_contacts:contact_id(email, name)')
      .eq('status', 'queued')
      .eq('channel', 'email')
      .lte('scheduled_at', new Date().toISOString())
      .limit(50);

    let sent = 0;
    for (const m of queued || []) {
      const to = (m as any).client_contacts?.email as string | undefined;
      if (!to) {
        await supabase
          .from('client_message_outbox')
          .update({ status: 'blocked', last_error: 'Contact has no email address' })
          .eq('id', m.id);
        continue;
      }

      await supabase.from('client_message_outbox').update({ status: 'sending' }).eq('id', m.id);

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          cc: (m as any).cc_emails?.length ? (m as any).cc_emails : undefined,
          subject: m.subject || 'Home Guide',
          text: m.body,
        }),
      });

      if (res.ok) {
        const payload = await res.json().catch(() => ({}));
        await supabase
          .from('client_message_outbox')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            provider: 'resend',
            provider_message_id: (payload as any)?.id ?? null,
            last_error: null,
          })
          .eq('id', m.id);
        sent += 1;
      } else {
        const text = await res.text();
        await supabase
          .from('client_message_outbox')
          .update({ status: 'failed', last_error: text.slice(0, 500) })
          .eq('id', m.id);
      }
    }

    return json({ enqueued: enqueued ?? 0, sent });
  } catch (e) {
    console.error('plantops-dispatch-messages error', e);
    return json({ error: 'Unexpected error' }, 500);
  }
});
