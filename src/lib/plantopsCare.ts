import { supabase } from '@/integrations/supabase/client';

/**
 * PlantOps care layer.
 *
 * IMPORTANT: no agronomic rule is hardcoded here. The operational base interval is
 * an explicit value stored on the installed plant (`plant_placements.water_interval_days`).
 * The species guide stays reference knowledge and is never parsed from free text.
 * No global organization coefficient affects intervals: care resolves as
 * documented override > placement baseline > structured species baseline > review.
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
  raiz_y_forma: { en: 'Our team', es: 'Nuestro equipo', de: 'Unser Team' },
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

/** A review signal emitted by the care engine — never a day adjustment. */
export interface CareReviewFlag {
  key: 'no_baseline' | 'light_mismatch' | 'override_without_reason' | string;
  required?: string | null;
  actual?: string | null;
}

export interface EffectiveCare {
  placement_id: string;
  estate_id: string | null;
  /** Structured numeric value documented for the species (used directly as baseline). */
  species_baseline_days: number | null;
  species_profile_id?: string | null;
  species_common_name?: string | null;
  species_scientific_name?: string | null;
  species_care_template?: Record<string, unknown> | null;
  /** Interval explicitly recorded for THIS placement. */
  placement_baseline_days?: number | null;
  /** Baseline in force. */
  base_days: number | null;
  /** Where the baseline comes from. 'none' = nothing documented (needs review). */
  base_source: 'placement' | 'species_profile' | 'none';
  /** Source of the effective interval: documented override > placement > species. */
  effective_source?: 'override' | 'placement' | 'species_profile' | 'none';
  /** @deprecated always [] — the engine applies no global coefficients. */
  configured_factors: CareFactor[];
  /** @deprecated always 0. */
  factors_total_days: number;
  override_days: number | null;
  effective_days: number | null;
  needs_review?: boolean;
  review_flags?: CareReviewFlag[];
  min_interval_days: number | null;
  override_reason: string | null;
  override_by?: string | null;
  override_at?: string | null;
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

/* ---------- Pot attributes (the pot is a care variable, not decoration) ---------- */

export interface PotDetailsInput {
  assetId: string;
  material?: string | null;
  diameterCm?: number | null;
  heightCm?: number | null;
  volumeLiters?: number | null;
  hasDrainage?: boolean | null;
  drainageHoles?: number | null;
  hasSaucer?: boolean | null;
  reservoir?: boolean | null;
  notes?: string | null;
}

export async function setPotDetails(input: PotDetailsInput): Promise<void> {
  const { error } = await supabase.rpc('plantops_set_pot_details', {
    p_asset_id: input.assetId,
    p_material: input.material ?? null,
    p_diameter_cm: input.diameterCm ?? null,
    p_height_cm: input.heightCm ?? null,
    p_volume_liters: input.volumeLiters ?? null,
    p_has_drainage: input.hasDrainage ?? null,
    p_drainage_holes: input.drainageHoles ?? null,
    p_has_saucer: input.hasSaucer ?? null,
    p_reservoir: input.reservoir ?? null,
    p_notes: input.notes ?? null,
  } as never);
  if (error) throw error;
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
  quantity_returned: number;
  returned_at: string | null;
  return_condition: string | null;
  name: string;
}

/** Organization-wide tool stock (all properties/warehouses of the org). */
export interface OrgToolRow {
  id: string;
  name: string;
  name_en: string;
  category: string;
  condition: string | null;
  estate_id: string;
  estate_name: string | null;
  quantity: number;
  assigned_open: number;
  available: number;
}

export async function fetchOrgToolInventory(): Promise<OrgToolRow[]> {
  const { data, error } = await supabase.rpc('plantops_org_tool_inventory' as never);
  if (error) throw error;
  return (data as unknown as OrgToolRow[]) || [];
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
  items: { assignment_id: string; quantity_returned_now: number; condition?: string | null }[],
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
    .select('id, inventory_item_id, quantity_assigned, quantity_returned, returned_at, return_condition, item:inventory_items(name, name_es)')
    .eq('shift_id' as never, shiftId)
    .order('assigned_at', { ascending: true });
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({
    id: r.id,
    inventory_item_id: r.inventory_item_id,
    quantity_assigned: r.quantity_assigned,
    quantity_returned: r.quantity_returned ?? 0,
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

/** Billing totals for a property, always separated per currency (never summed). */
export interface CurrencyBilling {
  currency: string;
  invoiced: number;
  draft: number;
  paid: number;
  pending: number;
  overdue: number;
}

export async function fetchPropertyBilling(estateId: string): Promise<CurrencyBilling[]> {
  const { data, error } = await supabase.rpc('plantops_property_billing', {
    p_estate_id: estateId,
  } as never);
  if (error) throw error;
  return ((data as unknown as CurrencyBilling[]) || []).map((r) => ({
    currency: r.currency,
    invoiced: Number(r.invoiced || 0),
    draft: Number(r.draft || 0),
    paid: Number(r.paid || 0),
    pending: Number(r.pending || 0),
    overdue: Number(r.overdue || 0),
  }));
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

/**
 * Rotates the token of an active link in a single backend transaction: the approved
 * manual, toggles, note and expiry are copied verbatim and the old token is revoked
 * only after the new one exists. Rotation is NOT an editorial approval.
 */
export async function rotateShareLink(linkId: string): Promise<{ id: string; token: string; url: string }> {
  const token = generateShareToken();
  const tokenHash = await hashToken(token);
  const { data, error } = await supabase.rpc('plantops_rotate_share_link', {
    p_link_id: linkId,
    p_token_hash: tokenHash,
  } as never);
  if (error) throw error;
  return { id: data as unknown as string, token, url: `${window.location.origin}/c/${token}` };
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

/* ---------- Canonical pot vocabulary (matches the DB validation) ---------- */

export const POT_MATERIALS = ['ceramica', 'plastico', 'barro', 'fibra', 'metal', 'vidrio', 'otro'] as const;
export type PotMaterial = (typeof POT_MATERIALS)[number];

export const POT_MATERIAL_LABELS: Record<PotMaterial, { en: string; es: string; de: string }> = {
  ceramica: { en: 'Ceramic', es: 'Cerámica', de: 'Keramik' },
  plastico: { en: 'Plastic', es: 'Plástico', de: 'Plastik' },
  barro: { en: 'Terracotta', es: 'Barro', de: 'Terrakotta' },
  fibra: { en: 'Fiber', es: 'Fibra', de: 'Faser' },
  metal: { en: 'Metal', es: 'Metal', de: 'Metall' },
  vidrio: { en: 'Glass', es: 'Vidrio', de: 'Glas' },
  otro: { en: 'Other', es: 'Otro', de: 'Andere' },
};

/* ---------- Transactional wizard plant line ---------- */

export interface PlantLineInput {
  estateId: string;
  plantName: string;
  placementId?: string | null;
  plantAssetId?: string | null;
  potAssetId?: string | null;
  zoneId?: string | null;
  zoneName?: string | null;
  floorLabel?: string | null;
  spotLabel?: string | null;
  spotNotes?: string | null;
  accessNotes?: string | null;
  contractId?: string | null;
  plantNotes?: string | null;
  withPot?: boolean;
  potMaterial?: string | null;
  potDiameterCm?: number | null;
  potHeightCm?: number | null;
  potVolumeLiters?: number | null;
  potHasDrainage?: boolean | null;
  potDrainageHoles?: number | null;
  potHasSaucer?: boolean | null;
  potReservoir?: boolean | null;
  potNotes?: string | null;
  lifecycleStatus?: 'active' | 'recovery' | 'retired';
  rentalPrice?: number | null;
  currency?: string;
  /** Explicit clears — a NULL id alone means "preserve", these flags mean "clear". */
  clearZone?: boolean;
  clearContract?: boolean;
}

export interface PlantLineResult {
  placement_id: string;
  plant_asset_id: string;
  pot_asset_id: string | null;
  zone_id: string | null;
  status: string;
}

/**
 * One transaction for a whole wizard plant line: zone, plant asset, PlantOps details,
 * pot asset with all pot attributes, placement and installation. Safe to call again
 * with the returned IDs — nothing is duplicated and nothing is left orphaned.
 */
export async function savePlantLine(input: PlantLineInput): Promise<PlantLineResult> {
  const { data, error } = await supabase.rpc('plantops_save_plant_line', {
    p_estate_id: input.estateId,
    p_plant_name: input.plantName,
    p_placement_id: input.placementId ?? null,
    p_plant_asset_id: input.plantAssetId ?? null,
    p_pot_asset_id: input.potAssetId ?? null,
    p_zone_id: input.zoneId ?? null,
    p_zone_name: input.zoneName ?? null,
    p_floor_label: input.floorLabel ?? null,
    p_spot_label: input.spotLabel ?? null,
    p_spot_notes: input.spotNotes ?? null,
    p_access_notes: input.accessNotes ?? null,
    p_contract_id: input.contractId ?? null,
    p_plant_notes: input.plantNotes ?? null,
    p_pot_material: input.potMaterial ?? null,
    p_pot_diameter_cm: input.potDiameterCm ?? null,
    p_pot_height_cm: input.potHeightCm ?? null,
    p_pot_volume_liters: input.potVolumeLiters ?? null,
    p_pot_has_drainage: input.potHasDrainage ?? null,
    p_pot_drainage_holes: input.potDrainageHoles ?? null,
    p_pot_has_saucer: input.potHasSaucer ?? null,
    p_pot_reservoir: input.potReservoir ?? null,
    p_pot_notes: input.potNotes ?? null,
    p_with_pot: input.withPot ?? true,
    p_lifecycle_status: input.lifecycleStatus ?? 'active',
    p_rental_price: input.rentalPrice ?? null,
    p_currency: input.currency ?? 'CRC',
    p_clear_zone: input.clearZone ?? false,
    p_clear_contract: input.clearContract ?? false,
  } as never);
  if (error) throw error;
  return data as unknown as PlantLineResult;
}

/* ---------- Care queue (one org-scoped read, no N+1) ---------- */

export interface CareQueueRow {
  placement_id: string;
  asset_id: string;
  plant_name: string;
  estate_id: string;
  estate_name: string | null;
  zone_id: string | null;
  zone_name: string | null;
  floor_label: string | null;
  spot_label: string | null;
  last_watered_at: string | null;
  next_water_due: string | null;
  base_days: number | null;
  configured_factors: CareFactor[] | null;
  factors_total_days: number | null;
  min_interval_days: number | null;
  override_days: number | null;
  override_reason: string | null;
  effective_days: number | null;
  care_responsibility: CareResponsibility | null;
  light_required: string | null;
  light_actual: string | null;
  water_amount_note: string | null;
  water_method: string | null;
  client_instructions: string | null;
  do_not_do: string | null;
  pot: PotInfo | null;
  open_incident: boolean;
  replacement_pending: boolean;
  care_state: CareState;
}

export async function fetchCareQueue(estateId?: string | null): Promise<CareQueueRow[]> {
  const { data, error } = await supabase.rpc('plantops_care_queue', {
    p_estate_id: estateId ?? null,
  } as never);
  if (error) throw error;
  return (data as unknown as CareQueueRow[]) || [];
}
