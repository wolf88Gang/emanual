import { supabase } from '@/integrations/supabase/client';

/**
 * PlantOps care layer.
 *
 * IMPORTANT: no agronomic rule is hardcoded here. The operational base interval is
 * an explicit value stored on the installed plant (`plant_placements.water_interval_days`).
 * The species guide stays reference knowledge and is never parsed from free text.
 * Every adjustment factor comes from organizations.plantops_care_settings_json.
 */

/* ---------- Canonical vocabularies (must match the DB constraints) ---------- */

export const CARE_RESPONSIBILITIES = ['raiz_y_forma', 'cliente', 'compartido'] as const;
export type CareResponsibility = (typeof CARE_RESPONSIBILITIES)[number];

export const CARE_ACTION_TYPES = [
  'water',
  'skip_water',
  'clean',
  'prune',
  'fertilize',
  'pest',
  'light_issue',
  'move',
  'rotate',
  'replace',
  'replace_requested',
  'photo',
  'issue',
  'note',
  'inspect',
] as const;
export type CareActionType = (typeof CARE_ACTION_TYPES)[number];

/** Actions that represent an open problem needing review. */
export const CARE_ISSUE_ACTIONS: CareActionType[] = ['issue', 'pest', 'light_issue', 'replace_requested'];

export const CARE_ACTION_LABELS: Record<CareActionType, { en: string; es: string; de: string }> = {
  water: { en: 'Watered', es: 'Regada', de: 'Gegossen' },
  skip_water: { en: 'Checked, no water needed', es: 'Revisada, no necesitaba agua', de: 'Geprüft, kein Wasser nötig' },
  clean: { en: 'Cleaned', es: 'Limpieza', de: 'Gereinigt' },
  prune: { en: 'Pruned', es: 'Poda', de: 'Beschnitten' },
  fertilize: { en: 'Fertilized', es: 'Abono', de: 'Gedüngt' },
  pest: { en: 'Pest detected', es: 'Plaga detectada', de: 'Schädling erkannt' },
  light_issue: { en: 'Light problem', es: 'Problema de luz', de: 'Lichtproblem' },
  move: { en: 'Moved', es: 'Movida', de: 'Verschoben' },
  rotate: { en: 'Rotated', es: 'Rotada', de: 'Gedreht' },
  replace: { en: 'Replaced', es: 'Reemplazada', de: 'Ersetzt' },
  replace_requested: { en: 'Replacement requested', es: 'Reemplazo solicitado', de: 'Ersatz angefordert' },
  photo: { en: 'Photo', es: 'Foto', de: 'Foto' },
  issue: { en: 'Issue', es: 'Problema', de: 'Problem' },
  note: { en: 'Note', es: 'Nota', de: 'Notiz' },
  inspect: { en: 'Inspected', es: 'Revisada', de: 'Kontrolliert' },
};

export const CARE_RESPONSIBILITY_LABELS: Record<CareResponsibility, { en: string; es: string; de: string }> = {
  raiz_y_forma: { en: 'Raíz y Forma', es: 'Raíz y Forma', de: 'Raíz y Forma' },
  cliente: { en: 'Client', es: 'Cliente', de: 'Kunde' },
  compartido: { en: 'Shared', es: 'Compartido', de: 'Geteilt' },
};

/* ---------- Types ---------- */

export interface CareFactor {
  key?: string;
  value?: string;
  label?: string;
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
  estate_id: string | null;
  /** Structured numeric value from the species guide, reference/prefill only. */
  species_baseline_days: number | null;
  /** Explicit operational base interval in force. */
  base_days: number | null;
  base_source: 'placement' | 'species_structured' | 'none';
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
  care_responsibility: CareResponsibility | null;
  reminder_contact: string | null;
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
  /** Explicit operational base/recommended interval. */
  waterIntervalDays?: number | null;
  overrideDays?: number | null;
  minIntervalDays?: number | null;
  waterAmountNote?: string | null;
  waterMethod?: string | null;
  lightRequired?: string | null;
  lightActual?: string | null;
  ventilation?: string | null;
  careResponsibility?: CareResponsibility | null;
  reminderContact?: string | null;
  clientInstructions?: string | null;
  doNotDo?: string | null;
  careNotes?: string | null;
  overrideReason?: string | null;
}

/**
 * Writes the care plan. Always explicit: every field on the care form is written
 * exactly as sent, so optional fields can be intentionally cleared. Unrelated
 * placement columns are not touched by the RPC.
 */
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
    p_explicit: true,
  } as never);
  if (error) throw error;
  return data as unknown as EffectiveCare;
}

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
  care?: EffectiveCare;
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

/* ---------- Visits ---------- */

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

/* ---------- Visit tools ---------- */

export interface VisitToolRow {
  id: string;
  inventory_item_id: string;
  quantity_assigned: number;
  returned_at: string | null;
  return_condition: string | null;
  name: string;
}

export async function assignVisitTools(
  shiftId: string,
  items: { inventory_item_id: string; quantity: number }[],
): Promise<number> {
  const { data, error } = await supabase.rpc('plantops_assign_visit_tools', {
    p_shift_id: shiftId,
    p_items: items as never,
  } as never);
  if (error) throw error;
  return Number(data ?? 0);
}

export async function returnVisitTools(
  shiftId: string,
  items: { assignment_id: string; condition?: string | null }[],
): Promise<number> {
  const { data, error } = await supabase.rpc('plantops_return_visit_tools', {
    p_shift_id: shiftId,
    p_items: items as never,
  } as never);
  if (error) throw error;
  return Number(data ?? 0);
}

/** Tools taken out on THIS visit only. */
export async function fetchVisitTools(shiftId: string): Promise<VisitToolRow[]> {
  const { data, error } = await supabase
    .from('tool_assignments')
    .select('id, inventory_item_id, quantity_assigned, returned_at, return_condition, item:inventory_items(name, name_es)')
    .eq('shift_id' as never, shiftId)
    .order('assigned_at', { ascending: true });
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({
    id: r.id,
    inventory_item_id: r.inventory_item_id,
    quantity_assigned: r.quantity_assigned,
    returned_at: r.returned_at,
    return_condition: r.return_condition,
    name: r.item?.name_es || r.item?.name || '—',
  }));
}

/* ---------- Billing ---------- */

/** Extra charge locked to the client of the visited property. */
export async function addChargeForEstate(params: {
  estateId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  productId?: string | null;
  shiftId?: string | null;
  currency?: string;
}): Promise<{ invoice_id: string; client_id: string }> {
  const { data, error } = await supabase.rpc('plantops_add_charge_for_estate', {
    p_estate_id: params.estateId,
    p_description: params.description,
    p_quantity: params.quantity,
    p_unit_price: params.unitPrice,
    p_product_id: params.productId ?? null,
    p_shift_id: params.shiftId ?? null,
    p_currency: params.currency ?? 'CRC',
  } as never);
  if (error) throw error;
  return data as unknown as { invoice_id: string; client_id: string };
}

export async function registerPayment(params: {
  invoiceId: string;
  amount: number;
  method?: string;
  date?: string;
  reference?: string | null;
  notes?: string | null;
}): Promise<{ total: number; paid: number; pending: number }> {
  const { data, error } = await supabase.rpc('plantops_register_payment', {
    p_invoice_id: params.invoiceId,
    p_amount: params.amount,
    p_payment_method: params.method ?? 'cash',
    p_payment_date: params.date ?? new Date().toISOString().slice(0, 10),
    p_reference: params.reference ?? null,
    p_notes: params.notes ?? null,
  } as never);
  if (error) throw error;
  return data as unknown as { total: number; paid: number; pending: number };
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

export async function fetchModules(orgId: string): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from('organizations')
    .select('modules_json')
    .eq('id', orgId)
    .single();
  if (error) throw error;
  return (((data as any)?.modules_json as Record<string, boolean>) || {}) as Record<string, boolean>;
}

export async function saveModules(orgId: string, modules: Record<string, boolean>) {
  const { error } = await supabase
    .from('organizations')
    .update({ modules_json: modules } as any)
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

/** 32 random bytes (64 hex chars). Only its SHA-256 hash is stored in the database. */
export function generateShareToken(): string {
  const bytes = new Uint8Array(32);
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

/** Product states used across the PlantOps UI. */
export type CareState = 'regar' | 'no_regar' | 'revisar';

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

/**
 * REGAR when due today or overdue; NO REGAR when the next date is in the future;
 * REVISAR when there is no usable care configuration (or an open issue, decided
 * by the caller).
 */
export function careState(nextDue: string | null | undefined, effectiveDays?: number | null): CareState {
  if (!nextDue || effectiveDays == null) return 'revisar';
  const s = dueState(nextDue);
  return s === 'overdue' || s === 'today' ? 'regar' : 'no_regar';
}

export function formatDateEs(d: string | null | undefined): string {
  if (!d) return '—';
  const date = d.length <= 10 ? new Date(`${d}T00:00:00`) : new Date(d);
  return date.toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function addDaysISO(from: string | Date, days: number): string {
  const base = typeof from === 'string' ? new Date(from.length <= 10 ? `${from}T00:00:00` : from) : from;
  const d = new Date(base.getTime() + days * 86400000);
  return d.toISOString().slice(0, 10);
}
