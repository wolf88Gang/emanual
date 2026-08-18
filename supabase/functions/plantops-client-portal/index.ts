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

const RESPONSIBILITY = new Set(['raiz_y_forma', 'cliente', 'compartido']);

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Public wording rules — identical vocabulary to the per-project portal. */
function waterMessage(nextDue: string | null): { state: 'no_regar' | 'regar' | 'revisar'; text: string | null } {
  if (!nextDue) return { state: 'revisar', text: null };
  if (nextDue > todayISO()) return { state: 'no_regar', text: `NO REGAR ANTES DEL ${nextDue}` };
  return { state: 'regar', text: 'PUEDE REGAR HOY' };
}

/**
 * Aggregated client portal: one token gives a client of the service organization
 * a read-only view across ALL of their projects. No login, no internal notes,
 * manuals only from approved snapshots.
 */
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
      .from('client_portal_links')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error) {
      console.error('client portal lookup failed', error.message);
      return json({ error: 'Lookup failed' }, 500);
    }
    if (!link) return json({ error: 'not_found' }, 404);
    if (link.revoked_at) return json({ error: 'revoked' }, 403);
    if (link.expires_at && new Date(link.expires_at) < new Date()) return json({ error: 'expired' }, 403);

    // Service role bypasses RLS, so every relation is verified explicitly.
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, org_id')
      .eq('id', link.client_id)
      .maybeSingle();
    if (!client || client.org_id !== link.org_id) return json({ error: 'not_found' }, 404);

    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', link.org_id)
      .maybeSingle();

    const { data: estates } = await supabase
      .from('estates')
      .select('id, name, address_text, plantops_service_plan_json')
      .eq('org_id', link.org_id)
      .eq('client_id', link.client_id);

    const visible = (estates || []).filter((e: any) => {
      const plan = e.plantops_service_plan_json || {};
      if (plan.project_status === 'archived') return false;
      // Per-project portal visibility can only narrow the client-level toggles.
      return plan.portal_visibility?.portal_enabled !== false;
    });
    const estateIds = visible.map((e: any) => e.id);

    const payload: Record<string, unknown> = {
      client: client.name ?? null,
      company: org?.name ?? null,
      contact_note: link.contact_note ?? null,
      projects: link.show_projects
        ? visible.map((e: any) => ({ id: e.id, name: e.name ?? null, address: e.address_text ?? null }))
        : [],
    };

    if (link.show_plants && estateIds.length) {
      const { data: placements } = await supabase
        .from('plant_placements')
        .select('id, estate_id, spot_label, next_water_due, last_watered_at, water_amount_note, client_instructions, do_not_do, care_responsibility, light_required, light_actual, asset:assets!plant_placements_asset_id_fkey(name), zone:zones(name)')
        .eq('org_id', link.org_id)
        .in('estate_id', estateIds)
        .eq('status', 'installed');

      payload.plants = (placements || []).map((p: any) => {
        const msg = waterMessage(p.next_water_due ?? null);
        return {
          id: p.id,
          estate_id: p.estate_id,
          name: p.asset?.name ?? null,
          zone: p.zone?.name ?? null,
          spot: p.spot_label,
          next_water_due: p.next_water_due,
          last_watered_at: p.last_watered_at,
          water_amount_note: link.show_care ? p.water_amount_note : null,
          client_instructions: link.show_care ? p.client_instructions : null,
          do_not_do: link.show_care ? p.do_not_do : null,
          light_required: p.light_required ?? null,
          light_actual: p.light_actual ?? null,
          care_responsibility: RESPONSIBILITY.has(p.care_responsibility) ? p.care_responsibility : null,
          water_state: msg.state,
          water_message: msg.text,
        };
      });
    }

    if (link.show_visits && estateIds.length) {
      const { data: logs } = await supabase
        .from('plant_care_logs')
        .select('id, estate_id, action_type, performed_at, placement_id')
        .eq('org_id', link.org_id)
        .in('estate_id', estateIds)
        .order('performed_at', { ascending: false })
        .limit(60);
      // Internal notes are never exposed.
      payload.activity = (logs || []).map((r: any) => ({
        id: r.id,
        estate_id: r.estate_id,
        action: r.action_type === 'skip' ? 'skip_water' : r.action_type,
        at: r.performed_at,
        placement_id: r.placement_id,
      }));
    }

    if (link.show_manuals && estateIds.length) {
      const { data: links } = await supabase
        .from('estate_share_links')
        .select('estate_id, manual_snapshot_json, manual_approved_at, revoked_at, show_manual')
        .eq('org_id', link.org_id)
        .in('estate_id', estateIds)
        .is('revoked_at', null);
      payload.manuals = (links || [])
        .filter((l: any) => l.show_manual && l.manual_approved_at && l.manual_snapshot_json)
        .map((l: any) => ({
          estate_id: l.estate_id,
          approved_at: l.manual_approved_at,
          snapshot: l.manual_snapshot_json,
        }));
    }

    if (link.show_invoices) {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('invoice_number, status, issue_date, due_date, total, currency, estate_id')
        .eq('org_id', link.org_id)
        .eq('client_id', link.client_id)
        .neq('status', 'draft')
        .order('issue_date', { ascending: false })
        .limit(24);
      payload.invoices = invoices || [];
    }

    if (link.show_documents && estateIds.length) {
      const { data: docs } = await supabase
        .from('documents')
        .select('id, title, category, estate_id, created_at')
        .in('estate_id', estateIds)
        .order('created_at', { ascending: false })
        .limit(30);
      // Titles only — files stay in the private bucket.
      payload.documents = docs || [];
    }

    return json(payload);
  } catch (e) {
    console.error('plantops-client-portal error', e);
    return json({ error: 'Unexpected error' }, 500);
  }
});
