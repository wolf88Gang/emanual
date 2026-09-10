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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Sends one queued reminder immediately, on operator request.
 * The recipient always comes from the stored contact row, never from the client.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  try {
    const { data: userData, error: userErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    const user = userData?.user;
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.messageIds)
      ? body.messageIds
      : body?.messageId
        ? [body.messageId]
        : [];
    const messageIds = ids.filter((id) => typeof id === 'string' && UUID.test(id)).slice(0, 50);
    if (messageIds.length === 0) return json({ error: 'messageId is required' }, 400);

    const { data: profile } = await admin
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.org_id || !['owner', 'manager', 'admin'].includes(String(profile.role))) {
      return json({ error: 'Forbidden' }, 403);
    }

    const { data: rows, error: rowsErr } = await admin
      .from('client_message_outbox')
      .select(OUTBOX_SELECT)
      .in('id', messageIds)
      .eq('org_id', profile.org_id)
      .in('status', ['queued', 'failed', 'sending']);
    if (rowsErr) throw rowsErr;

    let sent = 0;
    const failures: { id: string; error: string }[] = [];
    for (const row of (rows || []) as any[]) {
      const result = await dispatchOutboxEmail(admin, row);
      if (result.ok && !result.skipped) sent += 1;
      else if (!result.ok) failures.push({ id: row.id, error: result.error });
    }

    return json({ sent, failures, requested: messageIds.length });
  } catch (e) {
    console.error('plantops-send-reminder error', e);
    return json({ error: 'Unexpected error' }, 500);
  }
});
