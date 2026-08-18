import { supabase } from '@/integrations/supabase/client';

export type LifecycleStatus = 'active' | 'recovery' | 'retired';
export type PlacementStatus = 'reserved' | 'installed' | 'collected' | 'cancelled';
export type ContractType = 'recurring' | 'event';
/** Canonical contract statuses — must match rental_contracts_status_chk. */
export type ContractStatus = 'draft' | 'active' | 'ended' | 'cancelled';

export const CONTRACT_STATUSES: ContractStatus[] = ['draft', 'active', 'ended', 'cancelled'];

/** Allowed transitions; anything else is rejected by the UI. */
export const CONTRACT_STATUS_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ['draft', 'active', 'cancelled'],
  active: ['active', 'ended', 'cancelled'],
  ended: ['ended'],
  cancelled: ['cancelled'],
};

/** Canonical billing periods — must match rental_contracts_billing_chk. */
export type BillingPeriod = 'monthly' | 'quarterly' | 'event' | 'other';

export const BILLING_PERIODS: BillingPeriod[] = ['monthly', 'quarterly', 'event', 'other'];

export const PLANTOPS_PHOTO_BUCKET = 'plantops-photos';

export interface PlantOpsAssetRow {
  asset_id: string;
  name: string;
  asset_type: string;
  lifecycle_status: LifecycleStatus;
  condition_rating: number | null;
  rental_price: number | null;
  replacement_value: number | null;
  cost: number | null;
  currency: string;
  supplier_name: string | null;
  acquisition_date: string | null;
  retired_reason: string | null;
  placement: PlacementRow | null;
}

export interface PlacementRow {
  id: string;
  placement_slot_id: string;
  asset_id: string;
  pot_asset_id: string | null;
  estate_id: string;
  zone_id: string | null;
  contract_id: string | null;
  spot_label: string | null;
  spot_notes: string | null;
  access_notes: string | null;
  reference_photo_path: string | null;
  status: PlacementStatus;
  reserved_from: string;
  reserved_until: string | null;
  installed_at: string | null;
  collected_at: string | null;
  cancelled_at: string | null;
  condition_at_collection: number | null;
}

export interface RentalContractRow {
  id: string;
  org_id: string;
  client_id: string;
  estate_id: string | null;
  contract_type: ContractType;
  status: ContractStatus;
  starts_on: string;
  ends_on: string | null;
  price_amount: number | null;
  currency: string;
  billing_period: string | null;
  maintenance_frequency: string | null;
  replacement_rules: string | null;
  client_dos_donts: string | null;
  internal_notes: string | null;
}

/** Plant + pot inventory with commercial details and current placement. */
export async function fetchPlantOpsInventory(orgId: string): Promise<PlantOpsAssetRow[]> {
  const [detailsRes, placementsRes] = await Promise.all([
    supabase
      .from('plantops_asset_details')
      .select('*, asset:assets!plantops_asset_details_asset_id_fkey(id, name, asset_type)')
      .eq('org_id', orgId),
    supabase
      .from('plant_placements')
      .select('*')
      .eq('org_id', orgId)
      .in('status', ['reserved', 'installed']),
  ]);

  if (detailsRes.error) throw detailsRes.error;
  if (placementsRes.error) throw placementsRes.error;

  const placements = (placementsRes.data || []) as unknown as PlacementRow[];

  return (detailsRes.data || []).map((d: any) => {
    const active =
      placements.find((p) => p.asset_id === d.asset_id && p.status === 'installed' && !p.collected_at) ||
      placements.find((p) => p.asset_id === d.asset_id) ||
      null;
    return {
      asset_id: d.asset_id,
      name: d.asset?.name ?? '—',
      asset_type: d.asset?.asset_type ?? 'plant',
      lifecycle_status: d.lifecycle_status,
      condition_rating: d.condition_rating,
      rental_price: d.rental_price,
      replacement_value: d.replacement_value,
      cost: d.cost,
      currency: d.currency,
      supplier_name: d.supplier_name,
      acquisition_date: d.acquisition_date,
      retired_reason: d.retired_reason,
      placement: active,
    };
  });
}

export async function fetchPlacements(orgId: string): Promise<PlacementRow[]> {
  const { data, error } = await supabase
    .from('plant_placements')
    .select('*')
    .eq('org_id', orgId)
    .order('reserved_from', { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data || []) as unknown as PlacementRow[];
}

export async function fetchContracts(orgId: string): Promise<RentalContractRow[]> {
  const { data, error } = await supabase
    .from('rental_contracts')
    .select('*')
    .eq('org_id', orgId)
    .order('starts_on', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as RentalContractRow[];
}

/** Register / update commercial details of a plant or pot (owner/manager only). */
export async function upsertAssetDetails(params: {
  assetId: string;
  lifecycleStatus?: LifecycleStatus;
  conditionRating?: number | null;
  acquisitionDate?: string | null;
  supplierName?: string | null;
  cost?: number | null;
  replacementValue?: number | null;
  rentalPrice?: number | null;
  currency?: string;
  retiredReason?: string | null;
}) {
  const { error } = await supabase.rpc('plantops_upsert_asset_details', {
    p_asset_id: params.assetId,
    p_lifecycle_status: params.lifecycleStatus ?? 'active',
    p_condition_rating: params.conditionRating ?? null,
    p_acquisition_date: params.acquisitionDate ?? null,
    p_supplier_name: params.supplierName ?? null,
    p_cost: params.cost ?? null,
    p_replacement_value: params.replacementValue ?? null,
    p_rental_price: params.rentalPrice ?? null,
    p_currency: params.currency ?? 'CRC',
    p_retired_reason: params.retiredReason ?? null,
  });
  if (error) throw error;
}

export async function checkAvailability(params: {
  assetId: string;
  potAssetId?: string | null;
  from: string;
  to?: string | null;
}): Promise<boolean> {
  const { data, error } = await supabase.rpc('plantops_check_availability', {
    p_asset_id: params.assetId,
    p_pot_asset_id: params.potAssetId ?? null,
    p_from: params.from,
    p_to: params.to ?? null,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function reserveAsset(params: {
  assetId: string;
  potAssetId?: string | null;
  estateId: string;
  zoneId?: string | null;
  contractId?: string | null;
  spotLabel?: string | null;
  reservedFrom: string;
  reservedUntil?: string | null;
  placementSlotId?: string | null;
  spotNotes?: string | null;
  accessNotes?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc('plantops_reserve_asset', {
    p_asset_id: params.assetId,
    p_pot_asset_id: params.potAssetId ?? null,
    p_estate_id: params.estateId,
    p_zone_id: params.zoneId ?? null,
    p_contract_id: params.contractId ?? null,
    p_spot_label: params.spotLabel ?? null,
    p_reserved_from: params.reservedFrom,
    p_reserved_until: params.reservedUntil ?? null,
    p_placement_slot_id: params.placementSlotId ?? null,
    p_spot_notes: params.spotNotes ?? null,
    p_access_notes: params.accessNotes ?? null,
  });
  if (error) throw error;
  return data as unknown as string;
}

export async function installAsset(placementId: string, referencePhotoPath?: string | null) {
  const { error } = await supabase.rpc('plantops_install_asset', {
    p_placement_id: placementId,
    p_installed_at: new Date().toISOString(),
    p_reference_photo_path: referencePhotoPath ?? null,
  });
  if (error) throw error;
}

export async function collectAsset(params: {
  placementId: string;
  conditionRating?: number | null;
  nextLifecycle?: LifecycleStatus;
  retiredReason?: string | null;
}) {
  const { error } = await supabase.rpc('plantops_collect_asset', {
    p_placement_id: params.placementId,
    p_condition_rating: params.conditionRating ?? null,
    p_next_lifecycle: params.nextLifecycle ?? 'active',
    p_retired_reason: params.retiredReason ?? null,
  });
  if (error) throw error;
}

export async function cancelReservation(placementId: string, reason?: string | null) {
  const { error } = await supabase.rpc('plantops_cancel_reservation', {
    p_placement_id: placementId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
}

export async function replacePlant(params: {
  placementId: string;
  replacementAssetId: string;
  cause?: string | null;
  retiredLifecycle?: 'recovery' | 'retired';
  conditionRating?: number | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc('plantops_replace_plant', {
    p_placement_id: params.placementId,
    p_replacement_asset_id: params.replacementAssetId,
    p_cause: params.cause ?? null,
    p_retired_lifecycle: params.retiredLifecycle ?? 'recovery',
    p_condition_rating: params.conditionRating ?? null,
  });
  if (error) throw error;
  return data as unknown as string;
}

/** Uploads a placement reference photo to the private bucket. Returns the stored path. */
export async function uploadPlacementPhoto(orgId: string, placementId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${orgId}/${placementId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PLANTOPS_PHOTO_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** Internal viewers only: signed URL for a stored private path. */
export async function getPlacementPhotoUrl(path: string, expiresIn = 300): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PLANTOPS_PHOTO_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}
