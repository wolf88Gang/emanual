import { supabase } from '@/integrations/supabase/client';
import { resolveStoragePaths } from '@/lib/photoUrls';

export type BriefStatus =
  | 'draft' | 'client_submitted' | 'professional_review' | 'needs_clarification'
  | 'professionally_validated' | 'scope_agreed' | 'result_submitted'
  | 'client_approved' | 'adjustment_requested';
export type BriefRole = 'manager' | 'assignee' | 'client';
export type AssetKind = 'before' | 'target_reference' | 'agreed_target' | 'after';
export type Assessment = 'viable' | 'partial' | 'not_recommended' | 'inspect_first';
export type Agreement = 'exact' | 'approximate' | 'modified';
export type Match = 'yes' | 'partial' | 'no';

export interface Pin { x: number; y: number; note: string }

export interface VisualAsset {
  id: string; brief_id: string; kind: AssetKind; bucket: string; storage_path: string;
  source: string; source_ref_id: string | null; frozen_at: string | null; removed_at: string | null;
  created_at: string; uploaded_by: string; width: number | null; height: number | null;
}
export interface VisualBrief {
  id: string; task_id: string; service_type: string; status: BriefStatus;
  client_description: string | null; requested_by: string;
  professional_assessment: Assessment | null; professional_notes: string | null; assessed_at: string | null;
  proposed_agreement: Agreement | null; proposed_scope: string | null; proposed_by: string | null;
  agreed_scope: string | null; agreed_at: string | null;
  client_match: Match | null; client_action: 'approve' | 'request_adjustment' | null; client_feedback: string | null;
  reviewed_at: string | null; created_at: string; updated_at: string;
}
export interface BriefEvent {
  id: string; event_type: string; from_status: BriefStatus | null; to_status: BriefStatus | null;
  payload: Record<string, unknown>; created_at: string; actor_user_id: string | null;
}

/** Mirror of the server matrix — used only to decide which controls to show. The server remains authoritative. */
export type BriefAction =
  | 'edit_request' | 'submit' | 'clarify' | 'assess' | 'propose' | 'add_agreed_target'
  | 'agree' | 'complete' | 'review';

export function allowedActions(status: BriefStatus, role: BriefRole | null, isRequester: boolean, hasProposal: boolean, requesterIsInternal: boolean): BriefAction[] {
  if (!role) return [];
  const pro = role === 'assignee' || role === 'manager';
  const out: BriefAction[] = [];
  if ((status === 'draft' || status === 'needs_clarification') && (isRequester || role === 'manager')) out.push('edit_request', 'submit');
  if (status === 'professional_review' && pro) out.push('clarify', 'assess');
  if (status === 'professionally_validated' && pro) out.push('assess', 'propose', 'add_agreed_target');
  if (status === 'professionally_validated' && hasProposal && (isRequester || role === 'client' || (role === 'manager' && requesterIsInternal))) out.push('agree');
  if ((status === 'scope_agreed' || status === 'adjustment_requested') && pro) out.push('complete');
  if (status === 'result_submitted' && role !== 'assignee' && (isRequester || role === 'client')) out.push('review');
  return out;
}

// ---------- image pipeline (brief photos only; completion keeps its own upload) ----------
export const MAX_INPUT_BYTES = 15 * 1024 * 1024;
export const MAX_EDGE = 1600;

export function fitWithin(w: number, h: number, max = MAX_EDGE): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h };
  const scale = max / Math.max(w, h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

export class ImageDecodeError extends Error {}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    } catch { /* fall through */ }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new ImageDecodeError('decode')); };
    img.src = url;
  });
}

/** Produces the canonical image the user sees and annotates: EXIF-oriented, ≤1600px, JPEG. */
export async function processImage(file: File): Promise<{ blob: Blob; width: number; height: number; previewUrl: string }> {
  if (file.size > MAX_INPUT_BYTES) throw new Error('too_large');
  const isImage = file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name);
  if (!isImage) throw new Error('not_image');
  let src: ImageBitmap | HTMLImageElement;
  try { src = await decode(file); } catch { throw new ImageDecodeError(/\.(heic|heif)$/i.test(file.name) || /hei[cf]/.test(file.type) ? 'heic' : 'decode'); }
  const sw = 'naturalWidth' in src ? src.naturalWidth : src.width;
  const sh = 'naturalHeight' in src ? src.naturalHeight : src.height;
  const { width, height } = fitWithin(sw, sh);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  canvas.getContext('2d')!.drawImage(src, 0, 0, width, height);
  if ('close' in src) src.close();
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new ImageDecodeError('encode'))), 'image/jpeg', 0.82));
  return { blob, width, height, previewUrl: URL.createObjectURL(blob) };
}

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseMs = 800): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (e) { last = e; if (i < attempts - 1) await new Promise(r => setTimeout(r, baseMs * 2 ** i)); }
  }
  throw last;
}

// ---------- API ----------
export interface PendingPhoto { key: string; kind: AssetKind; blob?: Blob; width?: number; height?: number; previewUrl: string; pins: Pin[]; sourceAssetId?: string }

export async function uploadAndAttach(orgId: string, briefId: string, p: PendingPhoto) {
  if (p.sourceAssetId) {
    const { error } = await supabase.rpc('add_visual_asset', { p_brief_id: briefId, p_kind: p.kind, p_source: 'plant_history', p_source_ref_id: p.sourceAssetId, p_pins: p.pins as any });
    if (error) throw error;
    return;
  }
  const path = `${orgId}/briefs/${briefId}/${p.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  await withRetry(async () => {
    const { error } = await supabase.storage.from('photos').upload(path, p.blob!, { contentType: 'image/jpeg', upsert: false });
    if (error && !/exists/i.test(error.message)) throw error;
  });
  const { error } = await supabase.rpc('add_visual_asset', {
    p_brief_id: briefId, p_kind: p.kind, p_source: 'camera', p_storage_path: path,
    p_width: p.width ?? null, p_height: p.height ?? null, p_mime: 'image/jpeg', p_bytes: p.blob?.size ?? null, p_pins: p.pins as any,
  });
  if (error) throw error;
}

export async function getBriefRole(taskId: string, uid: string): Promise<BriefRole | null> {
  const { data } = await supabase.rpc('vsb_task_role', { _task_id: taskId, _uid: uid });
  return (data as BriefRole | null) ?? null;
}

export async function loadBriefBundle(briefId: string) {
  const [b, a, e] = await Promise.all([
    supabase.from('service_visual_briefs').select('*').eq('id', briefId).maybeSingle(),
    supabase.from('service_visual_assets').select('*').eq('brief_id', briefId).is('removed_at', null).order('created_at'),
    supabase.from('service_visual_brief_events').select('*').eq('brief_id', briefId).order('created_at'),
  ]);
  const assets = (a.data ?? []) as VisualAsset[];
  const ids = assets.map(x => x.id);
  const pins = ids.length ? (await supabase.from('visual_annotations').select('*').in('visual_asset_id', ids)).data ?? [] : [];
  return { brief: b.data as VisualBrief | null, assets, events: (e.data ?? []) as BriefEvent[], pins: pins as Array<{ visual_asset_id: string; x: number; y: number; note: string | null }> };
}

export async function signAssets(assets: Pick<VisualAsset, 'bucket' | 'storage_path'>[]) {
  const byBucket: Record<string, string[]> = {};
  assets.forEach(a => { (byBucket[a.bucket] ??= []).push(a.storage_path); });
  const out: Record<string, string> = {};
  for (const [bucket, paths] of Object.entries(byBucket)) {
    const signed = await resolveStoragePaths(bucket, paths);
    for (const [p, u] of Object.entries(signed)) out[`${bucket}/${p}`] = u;
  }
  return out;
}

export function rpcErrorMessage(e: any, es: boolean): string {
  const m = String(e?.message ?? '');
  if (/access denied/.test(m)) return es ? 'No tiene permiso para esta acción.' : 'You are not allowed to do this.';
  if (/transition not allowed/.test(m)) return es ? 'Esta acción no corresponde al estado actual.' : 'This action does not match the current state.';
  if (/frozen/.test(m)) return es ? 'Esta foto ya forma parte del registro y no se puede cambiar.' : 'This photo is part of the record and cannot change.';
  if (/spatial_context/.test(m)) return es ? 'Elija una zona o un activo.' : 'Choose a zone or an asset.';
  if (/final photo required/.test(m)) return es ? 'Se requiere la foto del resultado final.' : 'A final result photo is required.';
  return es ? 'No se pudo completar la acción.' : 'The action could not be completed.';
}
