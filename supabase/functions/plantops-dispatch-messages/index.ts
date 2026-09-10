import { createClient } from 'npm:@supabase/supabase-js@2';
import { dispatchOutboxEmail, OUTBOX_SELECT } from '../_shared/reminder-dispatch.ts';

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
 * Daily automatic dispatch.
 *
 * 1. Enqueues due client reminders (idempotent, one row per contact/channel/day).
 * 2. Sends every due EMAIL message queued in automatic mode.
 *
 * Manual-mode messages and WhatsApp stay queued, so the operator still reviews
 * and sends them by hand — nothing is silently marked as sent.
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

    const { data: queued, error: queuedErr } = await supabase
      .from('client_message_outbox')
      .select(OUTBOX_SELECT)
      .eq('status', 'queued')
      .eq('channel', 'email')
      .eq('send_mode', 'automatic')
      .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
      .limit(200);
    if (queuedErr) throw queuedErr;

    let sent = 0;
    let failed = 0;
    for (const m of (queued || []) as any[]) {
      const result = await dispatchOutboxEmail(supabase, m);
      if (result.ok && !result.skipped) sent += 1;
      else if (!result.ok) failed += 1;
    }

    return json({ enqueued: enqueued ?? 0, sent, failed });
  } catch (e) {
    console.error('plantops-dispatch-messages error', e);
    return json({ error: 'Unexpected error' }, 500);
  }
});
