import { supabase } from '@/integrations/supabase/client';

/**
 * PlantOps care layer.
 *
 * IMPORTANT: no agronomic rule is hardcoded here. Baselines come from the species
 * guide (plant_profiles.care_template_json) and every adjustment factor comes from
 * organizations.plantops_care_settings_json, configured by the organization.
 * This module only reads/writes and mirrors the SQL calculation for previews.
 */

export interface CareFactor {
  label: string;
  days: number;
}

export interface PotInfo {
  material: string | null;
  diameter_cm: number | null;
  height_cm: number | null;
  volume_liters: number | null;
  has_drainage: boolean | null;
  drainage_holes: number | null;
  has_saucer: boolean | null;
  reservoir: boolean | null;
  notes: string | null;
}

export interface EffectiveCare {
  placement_id: string;
  baseline_days: number | null;
  baseline_source: 'species' | 'none';
  configured_factors: CareFactor[];
  factors_total_days: number;
  override_days: number | null;
  effective_days: number | null;
  min_interval_days: number | null;
  override_reason: string | null;
  water_amount_note: string | null;
  water_method: string | null;
  light_required: string | null;
  light_actual: string | null;
  ventilation: string | null;
  care_responsibility: string | null;
  client_instructions: string | null;
  do_not_do: string | null;
  care_notes: string | null;
  last_watered_at: string | null;
  next_water_due: string | null;
  pot: PotInfo | null;
}

/** Organization-configured adjustment factors (days added/subtracted). */
export interface CareSettings {
  pot_material?: Record<string, number>;
  ventilation?: Record<string, number>;
  light_actual?: Record<string, number>;
  /** keys are 2-digit months: "01".."12" */
  season?: Record<string, number>;
}

export async function fetchEffectiveCare(placementId: string): Promise<EffectiveCare> {
  const { data, error } = await supabase.rpc('plantops_effective_care', {
    p_placement_id: placementId,
  });
  if (error) throw error;
  return data as unknown as EffectiveCare;
}

export interface CarePlanInput {
  placementId: string;
  waterIntervalDays?: number | null;
  overrideDays?: number | null;
  minIntervalDays?: number | null;
  waterAmountNote?: string | null;
  waterMethod?: string | null;
  lightRequired?: string | null;
  lightActual?: string | null;
  ventilation?: string | null;
  careResponsibility?: string | null;
  reminderContact?: string | null;
  clientInstructions?: string | null;
  doNotDo?: string | null;
  careNotes?: string | null;
  overrideReason?: string | null;
}

export async function setCarePlan(input: CarePlanInput): Promise<EffectiveCare> {
  const { data, error } = await supabase.rpc('plantops_set_care_plan', {
    p_placement_id: input.placementId,
    p_water_interval_days: input.waterIntervalDays ?? null,
    p_override_days: input.overrideDays ?? null,
    p_min_interval_days: input.minIntervalDays ?? null,
    p_water_amount_note: input.waterAmountNote ?? null,
    p_water_method: input.waterMethod ?? null,
    p_light_required: input.lightRequired ?? null,
    p_light_actual: input.lightActual ?? null,
    p_ventilation: input.ventilation ?? null,
    p_care_responsibility: input.careResponsibility ?? null,
    p_reminder_contact: input.reminderContact ?? null,
    p_client_instructions: input.clientInstructions ?? null,
    p_do_not_do: input.doNotDo ?? null,
    p_care_notes: input.careNotes ?? null,
    p_override_reason: input.overrideReason ?? null,
  });
  if (error) throw error;
  return data as unknown as EffectiveCare;
}

export type CareActionType =
  | 'water'
  | 'skip'
  | 'clean'
  | 'prune'
  | 'fertilize'
  | 'rotate'
  | 'inspect'
  | 'issue'
  | 'replace_requested';

export interface LogCareInput {
  placementId: string;
  actionType: CareActionType;
  notes?: string | null;
  amountNote?: string | null;
  photoPath?: string | null;
  shiftId?: string | null;
  overrideReason?: string | null;
  performedAt?: string;
}

export interface LogCareResult {
  log_id: string;
  too_early?: boolean;
  next_water_due?: string | null;
  [k: string]: unknown;
}

export async function logCare(input: LogCareInput): Promise<LogCareResult> {
  const { data, error } = await supabase.rpc('plantops_log_care', {
    p_placement_id: input.placementId,
    p_action_type: input.actionType,
    p_notes: input.notes ?? null,
    p_amount_note: input.amountNote ?? null,
    p_photo_path: input.photoPath ?? null,
    p_shift_id: input.shiftId ?? null,
    p_override_reason: input.overrideReason ?? null,
    p_performed_at: input.performedAt ?? new Date().toISOString(),
  });
  if (error) throw error;
  return data as unknown as LogCareResult;
}

/** Visit = worker shift on an estate. */
export async function startVisit(estateId: string, notes?: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('plantops_start_visit', {
    p_estate_id: estateId,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  return data as unknown as string;
}

export async function closeVisit(params: {
  shiftId: string;
  workDescription?: string | null;
  toolsExceptionReason?: string | null;
}) {
  const { error } = await supabase.rpc('plantops_close_visit', {
    p_shift_id: params.shiftId,
    p_work_description: params.workDescription ?? null,
    p_tools_exception_reason: params.toolsExceptionReason ?? null,
  });
  if (error) throw error;
}

/** Extra charge during a visit -> line on the client's draft invoice. */
export async function addCharge(params: {
  clientId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  productId?: string | null;
  shiftId?: string | null;
  currency?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('plantops_add_charge', {
    p_client_id: params.clientId,
    p_description: params.description,
    p_quantity: params.quantity,
    p_unit_price: params.unitPrice,
    p_product_id: params.productId ?? null,
    p_shift_id: params.shiftId ?? null,
    p_currency: params.currency ?? 'CRC',
  });
  if (error) throw error;
  return data as unknown as string;
}

/* ---------- Care settings (organization-configured factors) ---------- */

export async function fetchCareSettings(orgId: string): Promise<CareSettings> {
  const { data, error } = await supabase
    .from('organizations')
    .select('plantops_care_settings_json')
    .eq('id', orgId)
    .single();
  if (error) throw error;
  return (((data as any)?.plantops_care_settings_json as CareSettings) || {}) as CareSettings;
}

export async function saveCareSettings(orgId: string, settings: CareSettings) {
  const { error } = await supabase
    .from('organizations')
    .update({ plantops_care_settings_json: settings } as any)
    .eq('id', orgId);
  if (error) throw error;
}

/* ---------- Share links (client portal, no login) ---------- */

export interface ShareLinkRow {
  id: string;
  estate_id: string;
  client_id: string | null;
  show_plants: boolean;
  show_manual: boolean;
  show_last_visit: boolean;
  show_history: boolean;
  show_balance: boolean;
  contact_note: string | null;
  manual_snapshot_json: unknown | null;
  manual_approved_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

/** Random URL token; only its SHA-256 hash is stored in the database. */
export function generateShareToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createShareLink(params: {
  estateId: string;
  showPlants?: boolean;
  showManual?: boolean;
  showLastVisit?: boolean;
  showHistory?: boolean;
  showBalance?: boolean;
  contactNote?: string | null;
  expiresAt?: string | null;
}): Promise<{ id: string; token: string; url: string }> {
  const token = generateShareToken();
  const tokenHash = await hashToken(token);
  const { data, error } = await supabase.rpc('plantops_create_share_link', {
    p_estate_id: params.estateId,
    p_token_hash: tokenHash,
    p_show_plants: params.showPlants ?? true,
    p_show_manual: params.showManual ?? true,
    p_show_last_visit: params.showLastVisit ?? true,
    p_show_history: params.showHistory ?? false,
    p_show_balance: params.showBalance ?? false,
    p_contact_note: params.contactNote ?? null,
    p_expires_at: params.expiresAt ?? null,
  });
  if (error) throw error;
  return {
    id: data as unknown as string,
    token,
    url: `${window.location.origin}/c/${token}`,
  };
}

export async function revokeShareLink(linkId: string) {
  const { error } = await supabase.rpc('plantops_revoke_share_link', { p_link_id: linkId });
  if (error) throw error;
}

/** Publishes the approved manual snapshot the client will see (never auto-generated). */
export async function approveManual(linkId: string, snapshot: unknown) {
  const { error } = await supabase.rpc('plantops_approve_manual', {
    p_link_id: linkId,
    p_snapshot: snapshot as any,
  });
  if (error) throw error;
}

export async function fetchShareLinks(estateId: string): Promise<ShareLinkRow[]> {
  const { data, error } = await supabase
    .from('estate_share_links')
    .select('*')
    .eq('estate_id', estateId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as ShareLinkRow[];
}

/* ---------- Helpers ---------- */

export function dueState(nextDue: string | null | undefined): 'overdue' | 'today' | 'soon' | 'ok' | 'unknown' {
  if (!nextDue) return 'unknown';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${nextDue}T00:00:00`);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 2) return 'soon';
  return 'ok';
}
