import { supabase } from '@/integrations/supabase/client';
import { CARE_ACTION_LABELS, type CareActionType } from '@/lib/plantopsCare';

/**
 * Property-centric reads for PlantOps: the property is the shared unit between
 * the operator and the client. Everything here is read-only aggregation; all
 * writes keep going through the PlantOps RPCs.
 */

export interface PropertyPlacement {
  id: string;
  asset_id: string;
  asset_name: string;
  pot_asset_id: string | null;
  pot_name: string | null;
  pot: {
    material: string | null;
    diameter_cm: number | null;
    height_cm: number | null;
    volume_liters: number | null;
    has_drainage: boolean | null;
    drainage_holes: number | null;
    has_saucer: boolean | null;
    reservoir: boolean | null;
    notes: string | null;
  } | null;
  zone_id: string | null;
  zone_name: string | null;
  floor_label: string | null;
  spot_label: string | null;
  spot_notes: string | null;
  access_notes: string | null;
  status: string;
  installed_at: string | null;
  water_interval_days: number | null;
  water_interval_override_days: number | null;
  care_override_reason: string | null;
  min_interval_days: number | null;

  next_water_due: string | null;
  last_watered_at: string | null;
  care_responsibility: string | null;
  reminder_contact: string | null;
  client_instructions: string | null;
  do_not_do: string | null;
  care_notes: string | null;
  water_amount_note: string | null;
  water_method: string | null;
  light_required: string | null;
  light_actual: string | null;
  ventilation: string | null;
  care_updated_at: string | null;
  rental_price: number | null;
  currency: string | null;
}

export interface PropertyHistoryItem {
  id: string;
  kind: 'visit' | 'care' | 'charge' | 'payment';
  at: string;
  title: string;
  detail: string | null;
  photo_path?: string | null;
}

export interface PropertyBilling {
  currency: string;
  invoiced: number;
  paid: number;
  pending: number;
  invoices: {
    id: string;
    invoice_number: string | null;
    status: string;
    issue_date: string | null;
    total: number;
    paid: number;
    pending: number;
    currency: string;
  }[];
}

export interface PropertyDetail {
  estate: {
    id: string;
    name: string;
    address_text: string | null;
    setup_status: string | null;
    client_id: string | null;
  };
  client: { id: string; name: string; email: string | null; phone: string | null } | null;
  contract: {
    id: string;
    status: string;
    contract_type: string;
    starts_on: string;
    ends_on: string | null;
    price_amount: number | null;
    currency: string;
    billing_period: string | null;
    services_json: Record<string, unknown> | null;
    client_dos_donts: string | null;
  } | null;
  placements: PropertyPlacement[];
}

export async function fetchPropertyDetail(estateId: string): Promise<PropertyDetail> {
  const { data: estate, error: estateErr } = await supabase
    .from('estates')
    .select('id, name, address_text, setup_status, client_id, org_id')
    .eq('id', estateId)
    .single();
  if (estateErr) throw estateErr;

  const [clientRes, contractRes, placementRes, zoneRes] = await Promise.all([
    (estate as any).client_id
      ? supabase.from('clients').select('id, name, email, phone').eq('id', (estate as any).client_id).maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
    supabase
      .from('rental_contracts')
      .select('*')
      .eq('estate_id', estateId)
      .order('starts_on', { ascending: false })
      .limit(1),
    supabase
      .from('plant_placements')
      .select('*')
      .eq('estate_id', estateId)
      .in('status', ['reserved', 'installed'])
      .order('created_at', { ascending: true }),
    supabase.from('zones').select('id, name, floor_label').eq('estate_id', estateId),
  ]);

  if (placementRes.error) throw placementRes.error;

  const placements = (placementRes.data || []) as any[];
  const assetIds = Array.from(
    new Set(placements.flatMap((p) => [p.asset_id, p.pot_asset_id]).filter(Boolean)),
  ) as string[];

  const [assetsRes, detailsRes] = await Promise.all([
    assetIds.length
      ? supabase.from('assets').select('id, name').in('id', assetIds)
      : Promise.resolve({ data: [], error: null } as any),
    assetIds.length
      ? supabase.from('plantops_asset_details').select('*').in('asset_id', assetIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const assetName = new Map<string, string>(((assetsRes.data || []) as any[]).map((a) => [a.id, a.name]));
  const detailsById = new Map<string, any>(((detailsRes.data || []) as any[]).map((d) => [d.asset_id, d]));
  const zoneById = new Map<string, any>(((zoneRes.data || []) as any[]).map((z) => [z.id, z]));

  return {
    estate: {
      id: (estate as any).id,
      name: (estate as any).name,
      address_text: (estate as any).address_text,
      setup_status: (estate as any).setup_status,
      client_id: (estate as any).client_id,
    },
    client: ((clientRes as any)?.data ?? null) as any,
    contract: ((contractRes.data || [])[0] ?? null) as any,
    placements: placements.map((p) => {
      const potDetails = p.pot_asset_id ? detailsById.get(p.pot_asset_id) : null;
      const plantDetails = detailsById.get(p.asset_id);
      const zone = p.zone_id ? zoneById.get(p.zone_id) : null;
      return {
        id: p.id,
        asset_id: p.asset_id,
        asset_name: assetName.get(p.asset_id) ?? '—',
        pot_asset_id: p.pot_asset_id,
        pot_name: p.pot_asset_id ? assetName.get(p.pot_asset_id) ?? null : null,
        pot: potDetails
          ? {
              material: potDetails.pot_material ?? null,
              diameter_cm: potDetails.pot_diameter_cm ?? null,
              height_cm: potDetails.pot_height_cm ?? null,
              volume_liters: potDetails.pot_volume_liters ?? null,
              has_drainage: potDetails.pot_has_drainage ?? null,
              drainage_holes: potDetails.pot_drainage_holes ?? null,
              has_saucer: potDetails.pot_has_saucer ?? null,
              reservoir: potDetails.pot_reservoir ?? null,
              notes: potDetails.pot_notes ?? null,
            }
          : null,
        zone_id: p.zone_id,
        zone_name: zone?.name ?? null,
        floor_label: zone?.floor_label ?? null,
        spot_label: p.spot_label,
        spot_notes: p.spot_notes,
        access_notes: p.access_notes,
        status: p.status,
        installed_at: p.installed_at,
        water_interval_days: p.water_interval_days,
        water_interval_override_days: p.water_interval_override_days,
        care_override_reason: p.care_override_reason ?? null,
        min_interval_days: p.min_interval_days,
        next_water_due: p.next_water_due,
        last_watered_at: p.last_watered_at,
        care_responsibility: p.care_responsibility,
        reminder_contact: p.reminder_contact,
        client_instructions: p.client_instructions,
        do_not_do: p.do_not_do,
        care_notes: p.care_notes,
        water_amount_note: p.water_amount_note,
        water_method: p.water_method,
        light_required: p.light_required,
        light_actual: p.light_actual,
        ventilation: p.ventilation,
        care_updated_at: p.care_updated_at,
        rental_price: plantDetails?.rental_price ?? null,
        currency: plantDetails?.currency ?? null,
      };
    }),
  };
}

/** Visits, care logs, extra charges and payments merged into one timeline. */
export async function fetchPropertyHistory(
  estateId: string,
  clientId: string | null,
  language: 'en' | 'es' | 'de' = 'es',
): Promise<PropertyHistoryItem[]> {
  const [shiftsRes, logsRes, invoicesRes] = await Promise.all([
    supabase
      .from('worker_shifts')
      .select('id, check_in_at, check_out_at, work_description, visit_kind')
      .eq('estate_id', estateId)
      .order('check_in_at', { ascending: false })
      .limit(60),
    supabase
      .from('plant_care_logs')
      .select('id, performed_at, action_type, notes, amount_note, photo_path, placement_id, asset_id')
      .eq('estate_id', estateId)
      .order('performed_at', { ascending: false })
      .limit(120),
    clientId
      ? supabase
          .from('invoices')
          .select('id, invoice_number, issue_date, total, currency, status')
          .eq('client_id', clientId)
          .order('issue_date', { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const invoiceIds = ((invoicesRes.data || []) as any[]).map((i) => i.id);
  const [itemsRes, paymentsRes, assetsRes] = await Promise.all([
    invoiceIds.length
      ? supabase.from('invoice_items').select('*').in('invoice_id', invoiceIds)
      : Promise.resolve({ data: [], error: null } as any),
    invoiceIds.length
      ? supabase
          .from('client_payments')
          .select('id, invoice_id, amount, currency, payment_date, payment_method, reference')
          .in('invoice_id', invoiceIds)
      : Promise.resolve({ data: [], error: null } as any),
    (() => {
      const ids = Array.from(new Set(((logsRes.data || []) as any[]).map((l) => l.asset_id).filter(Boolean)));
      return ids.length
        ? supabase.from('assets').select('id, name').in('id', ids as string[])
        : Promise.resolve({ data: [], error: null } as any);
    })(),
  ]);

  const assetName = new Map<string, string>(((assetsRes.data || []) as any[]).map((a) => [a.id, a.name]));
  const invoiceById = new Map<string, any>(((invoicesRes.data || []) as any[]).map((i) => [i.id, i]));

  const items: PropertyHistoryItem[] = [];

  for (const s of ((shiftsRes.data || []) as any[])) {
    items.push({
      id: `shift-${s.id}`,
      kind: 'visit',
      at: s.check_in_at,
      title: language === 'es' ? 'Visita' : 'Visit',
      detail: [s.work_description, s.check_out_at ? null : language === 'es' ? 'Sin cerrar' : 'Open'].filter(Boolean).join(' · ') || null,
    });
  }

  for (const l of ((logsRes.data || []) as any[])) {
    const label = CARE_ACTION_LABELS[l.action_type as CareActionType]?.[language] ?? l.action_type;
    items.push({
      id: `care-${l.id}`,
      kind: 'care',
      at: l.performed_at,
      title: `${label} — ${assetName.get(l.asset_id) ?? '—'}`,
      detail: [l.amount_note, l.notes].filter(Boolean).join(' · ') || null,
      photo_path: l.photo_path,
    });
  }

  for (const it of ((itemsRes.data || []) as any[])) {
    const inv = invoiceById.get(it.invoice_id);
    items.push({
      id: `item-${it.id}`,
      kind: 'charge',
      at: inv?.issue_date ? `${inv.issue_date}T12:00:00Z` : new Date().toISOString(),
      title: `${language === 'es' ? 'Cargo' : 'Charge'}: ${it.description}`,
      detail: `${it.quantity} × ${it.unit_price} ${inv?.currency ?? ''}`.trim(),
    });
  }

  for (const p of ((paymentsRes.data || []) as any[])) {
    items.push({
      id: `pay-${p.id}`,
      kind: 'payment',
      at: `${p.payment_date}T12:00:00Z`,
      title: `${language === 'es' ? 'Pago recibido' : 'Payment received'}: ${p.amount} ${p.currency}`,
      detail: [p.payment_method, p.reference].filter(Boolean).join(' · ') || null,
    });
  }

  return items.sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''));
}

export async function fetchPropertyBilling(clientId: string | null): Promise<PropertyBilling> {
  const empty: PropertyBilling = { currency: 'CRC', invoiced: 0, paid: 0, pending: 0, invoices: [] };
  if (!clientId) return empty;

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, issue_date, total, currency')
    .eq('client_id', clientId)
    .order('issue_date', { ascending: false });
  if (error) throw error;

  const ids = ((invoices || []) as any[]).map((i) => i.id);
  const { data: payments } = ids.length
    ? await supabase.from('client_payments').select('invoice_id, amount').in('invoice_id', ids)
    : ({ data: [] } as any);

  const paidByInvoice = new Map<string, number>();
  for (const p of ((payments || []) as any[])) {
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + Number(p.amount ?? 0));
  }

  const rows = ((invoices || []) as any[]).map((i) => {
    const paid = paidByInvoice.get(i.id) ?? 0;
    const total = Number(i.total ?? 0);
    return {
      id: i.id,
      invoice_number: i.invoice_number,
      status: i.status,
      issue_date: i.issue_date,
      total,
      paid,
      pending: Math.max(0, total - paid),
      currency: i.currency ?? 'CRC',
    };
  });

  return {
    currency: rows[0]?.currency ?? 'CRC',
    invoiced: rows.reduce((s, r) => s + r.total, 0),
    paid: rows.reduce((s, r) => s + r.paid, 0),
    pending: rows.reduce((s, r) => s + r.pending, 0),
    invoices: rows,
  };
}

/* ---------- Manual snapshot ---------- */

export interface ManualSnapshot {
  version: 1;
  generated_at: string;
  property: { name: string; address: string | null };
  client: { name: string | null };
  services: string[];
  plants: {
    name: string;
    location: string;
    pot: string | null;
    water: string;
    light: string | null;
    responsibility: string | null;
    client_instructions: string | null;
    do_not_do: string | null;
  }[];
  contact_note: string | null;
}

/**
 * Builds the manual the client will see. It is a snapshot of what is configured
 * right now — never a generated recommendation.
 */
export function buildManualSnapshot(
  detail: PropertyDetail,
  contactNote: string | null,
  /**
   * Canonical effective days per placement (base + configured factors + minimum,
   * with a valid manual override winning). Required for a truthful manual: the
   * snapshot must never recompute watering as `override ?? base`.
   */
  effectiveDaysByPlacement: Record<string, number | null> = {},
): ManualSnapshot {
  const services = Object.entries((detail.contract?.services_json as Record<string, unknown>) || {})
    .filter(([, v]) => Boolean(v))
    .map(([k]) => k);

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    property: { name: detail.estate.name, address: detail.estate.address_text },
    client: { name: detail.client?.name ?? null },
    services,
    plants: detail.placements
      .filter((p) => p.status === 'installed')
      .map((p) => {
        const days = Object.prototype.hasOwnProperty.call(effectiveDaysByPlacement, p.id)
          ? effectiveDaysByPlacement[p.id]
          : null;
        return {
          name: p.asset_name,
          location: [p.floor_label, p.zone_name, p.spot_label].filter(Boolean).join(' · ') || '—',
          pot: p.pot
            ? [p.pot.material, p.pot.diameter_cm ? `${p.pot.diameter_cm} cm` : null, p.pot.has_drainage ? 'con drenaje' : 'sin drenaje']
                .filter(Boolean)
                .join(' · ')
            : null,
          water: days
            ? `Cada ${days} días${p.water_amount_note ? ` · ${p.water_amount_note}` : ''}`
            : 'Pendiente de definir',
          light: [p.light_required, p.light_actual].filter(Boolean).join(' → ') || null,
          responsibility: p.care_responsibility,
          client_instructions: p.client_instructions,
          do_not_do: p.do_not_do,
        };
      }),
    contact_note: contactNote,
  };
}

/** True when a care plan changed after the last approved manual version. */
export function manualIsStale(detail: PropertyDetail, approvedAt: string | null): boolean {
  if (!approvedAt) return true;
  const latest = detail.placements
    .map((p) => p.care_updated_at)
    .filter(Boolean)
    .sort()
    .pop();
  if (!latest) return false;
  return new Date(latest) > new Date(approvedAt);
}

export async function updateShareLink(params: {
  linkId: string;
  showPlants?: boolean;
  showManual?: boolean;
  showLastVisit?: boolean;
  showHistory?: boolean;
  showBalance?: boolean;
  contactNote?: string | null;
  expiresAt?: string | null;
  clearExpiry?: boolean;
}) {
  const { error } = await supabase.rpc('plantops_update_share_link', {
    p_link_id: params.linkId,
    p_show_plants: params.showPlants ?? null,
    p_show_manual: params.showManual ?? null,
    p_show_last_visit: params.showLastVisit ?? null,
    p_show_history: params.showHistory ?? null,
    p_show_balance: params.showBalance ?? null,
    p_contact_note: params.contactNote ?? null,
    p_expires_at: params.expiresAt ?? null,
    p_clear_expiry: params.clearExpiry ?? false,
  } as never);
  if (error) throw error;
}

/* ---------- Service plan (a property can be served without a rental contract) ---------- */

export interface ServicePlan {
  services?: Record<string, boolean>;
  visit_frequency?: string;
  starts_on?: string;
  base_price?: number | null;
  currency?: string;
  billing_period?: string;
  reminder_contact?: string | null;
}

export async function fetchServicePlan(estateId: string): Promise<ServicePlan> {
  const { data, error } = await supabase
    .from('estates')
    .select('plantops_service_plan_json')
    .eq('id', estateId)
    .single();
  if (error) throw error;
  return (((data as any)?.plantops_service_plan_json as ServicePlan) || {}) as ServicePlan;
}

export async function saveServicePlan(estateId: string, plan: ServicePlan): Promise<void> {
  const { error } = await supabase
    .from('estates')
    .update({ plantops_service_plan_json: plan } as any)
    .eq('id', estateId);
  if (error) throw error;
}

/** Properties whose PlantOps setup wizard was never finished. */
export async function fetchIncompleteSetups(
  orgId: string,
): Promise<{ id: string; name: string; client_name: string | null }[]> {
  const { data, error } = await supabase
    .from('estates')
    .select('id, name, client:clients(name)')
    .eq('org_id', orgId)
    .eq('setup_status' as never, 'setup')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data || []) as any[]).map((e) => ({
    id: e.id,
    name: e.name,
    client_name: e.client?.name ?? null,
  }));
}
