import { createClient } from 'npm:@supabase/supabase-js@2';

// Locally defined CORS headers — no reliance on external helper paths.
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

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Canonical DB values only. */
const RESPONSIBILITY = new Set(['raiz_y_forma', 'cliente', 'compartido']);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Public wording rules. */
function waterMessage(nextDue: string | null): { state: 'no_regar' | 'regar' | 'revisar'; text: string | null } {
  if (!nextDue) return { state: 'revisar', text: null };
  if (nextDue > todayISO()) return { state: 'no_regar', text: `NO REGAR ANTES DEL ${nextDue}` };
  return { state: 'regar', text: 'PUEDE REGAR HOY' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!token || token.length < 16 || token.length > 128 || !/^[a-f0-9]+$/i.test(token)) {
      return json({ error: 'Invalid token' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const tokenHash = await sha256Hex(token);
    const { data: link, error } = await supabase
      .from('estate_share_links')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error) {
      console.error('link lookup failed', error.message);
      return json({ error: 'Lookup failed' }, 500);
    }
    if (!link) return json({ error: 'not_found' }, 404);
    if (link.revoked_at) return json({ error: 'revoked' }, 403);
    if (link.expires_at && new Date(link.expires_at) < new Date()) return json({ error: 'expired' }, 403);

    // Service role bypasses RLS, so every relation is verified explicitly.
    const { data: estate } = await supabase
      .from('estates')
      .select('id, name, address_text, org_id, client_id')
      .eq('id', link.estate_id)
      .maybeSingle();

    if (!estate || estate.org_id !== link.org_id) return json({ error: 'not_found' }, 404);
    if ((estate.client_id ?? null) !== (link.client_id ?? null)) return json({ error: 'not_found' }, 404);

    let clientName: string | null = null;
    if (link.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('id, name, org_id')
        .eq('id', link.client_id)
        .maybeSingle();
      if (!client || client.org_id !== link.org_id) return json({ error: 'not_found' }, 404);
      clientName = client.name ?? null;
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', link.org_id)
      .maybeSingle();

    const payload: Record<string, unknown> = {
      estate: { name: estate.name ?? null, address: estate.address_text ?? null },
      client: clientName,
      company: org?.name ?? null,
      contact_note: link.contact_note ?? null,
      // The manual is always the internally approved snapshot, never live data.
      manual: link.show_manual && link.manual_approved_at ? link.manual_snapshot_json : null,
      manual_approved_at: link.show_manual ? link.manual_approved_at : null,
    };

    if (link.show_plants) {
      const { data: placements } = await supabase
        .from('plant_placements')
        .select('id, spot_label, next_water_due, last_watered_at, water_amount_note, client_instructions, do_not_do, care_responsibility, light_required, light_actual, asset:assets!plant_placements_asset_id_fkey(name), zone:zones(name)')
        .eq('org_id', link.org_id)
        .eq('estate_id', link.estate_id)
        .eq('status', 'installed');
      payload.plants = (placements || []).map((p: any) => {
        const msg = waterMessage(p.next_water_due ?? null);
        return {
          id: p.id,
          name: p.asset?.name ?? null,
          zone: p.zone?.name ?? null,
          spot: p.spot_label,
          next_water_due: p.next_water_due,
          last_watered_at: p.last_watered_at,
          water_amount_note: p.water_amount_note,
          client_instructions: p.client_instructions,
          do_not_do: p.do_not_do,
          light_required: p.light_required ?? null,
          light_actual: p.light_actual ?? null,
          care_responsibility: RESPONSIBILITY.has(p.care_responsibility) ? p.care_responsibility : null,
          water_state: msg.state,
          water_message: msg.text,
        };
      });
    }

    if (link.show_last_visit || link.show_history) {
      const limit = link.show_history ? 50 : 5;
      const { data: logs } = await supabase
        .from('plant_care_logs')
        .select('id, action_type, performed_at, placement_id')
        .eq('org_id', link.org_id)
        .eq('estate_id', link.estate_id)
        .order('performed_at', { ascending: false })
        .limit(limit);
      // Internal notes are never exposed.
      payload.activity = (logs || []).map((r: any) => ({
        id: r.id,
        action: r.action_type === 'skip' ? 'skip_water' : r.action_type,
        at: r.performed_at,
        placement_id: r.placement_id,
      }));
    }

    if (link.show_balance && link.client_id) {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('invoice_number, status, issue_date, due_date, total, currency')
        .eq('org_id', link.org_id)
        .eq('client_id', link.client_id)
        .neq('status', 'draft')
        .order('issue_date', { ascending: false })
        .limit(12);
      payload.invoices = invoices || [];
    }

    return json(payload);
  } catch (e) {
    console.error('plantops-portal error', e);
    return json({ error: 'Unexpected error' }, 500);
  }
});
