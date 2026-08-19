import { supabase } from '@/integrations/supabase/client';
import { fetchServicePlan, saveServicePlan, type ServicePlan } from '@/lib/plantopsProperty';

/**
 * Client-first reads for the B2B2C model:
 *
 *   Home Guide -> organization (service company) -> clients -> projects (estates)
 *   -> plants, care, visits, manuals, invoices and portals
 *
 * A client of the organization is NOT an organization and never needs a login:
 * the client sees their project through the public portal token (`/c/<token>`).
 * All writes keep going through the existing PlantOps RPCs.
 */

/* ---------------- capability / module vocabulary ----------------
 * Single source of truth: src/lib/homeGuideModules.ts. The names below are
 * kept as aliases so existing screens continue to compile.
 */

import {
  MODULE_KEYS,
  MODULES,
  MODULE_LIST,
  PROJECT_MODULE_KEYS,
  DEFAULT_MODULES,
  resolveModules,
  type ModuleKey,
} from '@/lib/homeGuideModules';

export const CAPABILITY_KEYS = MODULE_KEYS;
export type CapabilityKey = ModuleKey;

/** Capabilities that can be toggled per project (org-level keys are a superset). */
export const PROJECT_CAPABILITY_KEYS: CapabilityKey[] = PROJECT_MODULE_KEYS;

export const CAPABILITY_LABELS = Object.fromEntries(
  MODULE_LIST.map((m) => [m.key, m.label]),
) as Record<CapabilityKey, { en: string; es: string; de: string }>;

export const DEFAULT_ORG_MODULES: Record<CapabilityKey, boolean> = DEFAULT_MODULES;

export const DEFAULT_PROJECT_CAPABILITIES: Record<string, boolean> = Object.fromEntries(
  PROJECT_MODULE_KEYS.map((k) => [k, DEFAULT_MODULES[k]]),
);


export const PORTAL_VISIBILITY_KEYS = ['plants', 'care', 'manuals', 'visits', 'invoices', 'documents'] as const;
export type PortalVisibilityKey = (typeof PORTAL_VISIBILITY_KEYS)[number];

export const DEFAULT_PORTAL_VISIBILITY: Record<PortalVisibilityKey, boolean> = {
  plants: true,
  care: true,
  manuals: true,
  visits: true,
  invoices: false,
  documents: false,
};

export const PORTAL_VISIBILITY_LABELS: Record<PortalVisibilityKey, { en: string; es: string; de: string }> = {
  plants: { en: 'Plants', es: 'Plantas', de: 'Pflanzen' },
  care: { en: 'Care', es: 'Cuidados', de: 'Pflege' },
  manuals: { en: 'Manual', es: 'Manual', de: 'Handbuch' },
  visits: { en: 'Visits', es: 'Visitas', de: 'Besuche' },
  invoices: { en: 'Invoices', es: 'Facturas', de: 'Rechnungen' },
  documents: { en: 'Documents', es: 'Documentos', de: 'Dokumente' },
};

export const PROJECT_TYPES = ['residential', 'commercial', 'mall', 'office', 'hotel', 'event', 'other'] as const;
export const PROJECT_STATUSES = ['setup', 'active', 'paused', 'archived'] as const;

/** Org-level modules, always normalized to the canonical keys. */
export function normalizeOrgModules(raw: Record<string, unknown> | null | undefined): Record<CapabilityKey, boolean> {
  const out = { ...DEFAULT_ORG_MODULES };
  if (raw && typeof raw === 'object') {
    for (const k of CAPABILITY_KEYS) {
      if (k in raw) out[k] = !!(raw as Record<string, unknown>)[k];
    }
  }
  return out;
}

export function projectCapabilities(plan: ServicePlan | null | undefined): Record<string, boolean> {
  const raw = (plan as any)?.capabilities;
  const out = { ...DEFAULT_PROJECT_CAPABILITIES };
  if (raw && typeof raw === 'object') {
    for (const k of PROJECT_CAPABILITY_KEYS) if (k in raw) out[k] = !!raw[k];
  }
  return out;
}

export function portalVisibility(plan: ServicePlan | null | undefined): Record<string, boolean> {
  const raw = (plan as any)?.portal_visibility;
  const out: Record<string, boolean> = { ...DEFAULT_PORTAL_VISIBILITY };
  if (raw && typeof raw === 'object') {
    for (const k of PORTAL_VISIBILITY_KEYS) if (k in raw) out[k] = !!raw[k];
  }
  return out;
}

/** A project capability is only usable when the organization has the module on. */
export function effectiveProjectCapabilities(
  orgModules: Record<string, boolean>,
  plan: ServicePlan | null | undefined,
): Record<string, boolean> {
  const caps = projectCapabilities(plan);
  const out: Record<string, boolean> = {};
  for (const k of PROJECT_CAPABILITY_KEYS) out[k] = !!caps[k] && orgModules[k] !== false;
  return out;
}

export async function saveProjectPlanPatch(estateId: string, patch: Partial<ServicePlan> & Record<string, unknown>) {
  const current = await fetchServicePlan(estateId);
  await saveServicePlan(estateId, { ...current, ...patch } as ServicePlan);
}

/* ---------------- aggregated reads ---------------- */

export interface CurrencyBalance {
  currency: string;
  invoiced: number;
  paid: number;
  pending: number;
  overdue: number;
}

export interface ClientProjectRow {
  id: string;
  name: string;
  address_text: string | null;
  setup_status: string | null;
  project_type: string;
  project_status: string;
  capabilities: Record<string, boolean>;
  plants: number;
  waterToday: number;
  needsReview: number;
  nextCare: string | null;
  nextVisit: string | null;
  manualApproved: boolean;
  portalActive: boolean;
  openIssues: number;
  balances: CurrencyBalance[];
}

export interface ClientWorkspaceRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contactName: string | null;
  projectsCount: number;
  activeProjects: number;
  plants: number;
  waterToday: number;
  needsReview: number;
  nextVisit: string | null;
  openIssues: number;
  portalActive: boolean;
  balances: CurrencyBalance[];
  lastCommunicationAt: string | null;
  projects: ClientProjectRow[];
}

const today = () => new Date().toISOString().slice(0, 10);

function balancesFor(invoices: any[]): CurrencyBalance[] {
  const map = new Map<string, CurrencyBalance>();
  const t = today();
  for (const inv of invoices) {
    if (inv.status === 'cancelled') continue;
    const cur = inv.currency || 'CRC';
    const row = map.get(cur) ?? { currency: cur, invoiced: 0, paid: 0, pending: 0, overdue: 0 };
    const total = Number(inv.total || 0);
    row.invoiced += total;
    if (inv.status === 'paid') row.paid += total;
    else if (inv.status === 'draft') {
      /* drafts are never counted as receivable */
    } else {
      row.pending += total;
      if (inv.status === 'overdue' || (inv.due_date && inv.due_date < t)) row.overdue += total;
    }
    map.set(cur, row);
  }
  return [...map.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

/**
 * One row per CLIENT of the organization — never one row per contact or user.
 */
export async function fetchClientWorkspace(orgId: string): Promise<ClientWorkspaceRow[]> {
  const [clientsRes, estatesRes, placementsRes, invoicesRes, linksRes, tasksRes] = await Promise.all([
    supabase.from('clients').select('id, name, email, phone, notes, created_at').eq('org_id', orgId).order('name'),
    supabase
      .from('estates')
      .select('id, name, address_text, setup_status, client_id, plantops_service_plan_json')
      .eq('org_id', orgId),
    supabase
      .from('plant_placements')
      .select('id, estate_id, status, next_water_due, water_interval_days, water_interval_override_days')
      .eq('org_id', orgId),
    supabase.from('invoices').select('id, client_id, status, total, currency, due_date, created_at').eq('org_id', orgId),
    supabase
      .from('estate_share_links')
      .select('id, estate_id, client_id, revoked_at, expires_at, manual_approved_at, created_at, updated_at')
      .eq('org_id', orgId),
    supabase.from('tasks').select('id, estate_id, status, due_date').in('status', ['pending', 'in_progress', 'overdue']),
  ]);

  if (clientsRes.error) throw clientsRes.error;
  if (estatesRes.error) throw estatesRes.error;

  const estates = (estatesRes.data || []) as any[];
  const placements = (placementsRes.data || []) as any[];
  const invoices = (invoicesRes.data || []) as any[];
  const links = (linksRes.data || []) as any[];
  const tasks = (tasksRes.data || []) as any[];
  const estateIds = new Set(estates.map((e) => e.id));
  const t = today();
  const now = new Date().toISOString();

  const rows: ClientWorkspaceRow[] = (clientsRes.data || []).map((c: any) => {
    const clientEstates = estates.filter((e) => e.client_id === c.id);
    const projects: ClientProjectRow[] = clientEstates.map((e) => {
      const plan = (e.plantops_service_plan_json || {}) as ServicePlan;
      const ps = placements.filter((p) => p.estate_id === e.id);
      const installed = ps.filter((p) => p.status === 'installed');
      const due = installed.filter((p) => p.next_water_due && p.next_water_due <= t);
      const review = installed.filter(
        (p) => p.water_interval_override_days == null && p.water_interval_days == null,
      );
      const nextCare = installed
        .map((p) => p.next_water_due)
        .filter(Boolean)
        .sort()[0] ?? null;
      const estTasks = tasks.filter((x) => x.estate_id === e.id);
      const nextVisit = estTasks
        .map((x) => x.due_date)
        .filter((d: string | null) => !!d && d >= t)
        .sort()[0] ?? null;
      const openIssues = estTasks.filter((x) => x.status === 'overdue' || (x.due_date && x.due_date < t)).length;
      const estLinks = links.filter((x) => x.estate_id === e.id);
      const activeLink = estLinks.find((x) => !x.revoked_at && (!x.expires_at || x.expires_at > now));
      return {
        id: e.id,
        name: e.name,
        address_text: e.address_text,
        setup_status: e.setup_status,
        project_type: ((plan as any).project_type as string) || 'residential',
        project_status: ((plan as any).project_status as string) || (e.setup_status === 'active' ? 'active' : 'setup'),
        capabilities: projectCapabilities(plan),
        plants: installed.length,
        waterToday: due.length,
        needsReview: review.length,
        nextCare,
        nextVisit,
        manualApproved: estLinks.some((x) => !!x.manual_approved_at),
        portalActive: !!activeLink,
        openIssues,
        balances: [],
      };
    });

    const clientInvoices = invoices.filter((i) => i.client_id === c.id);
    const balances = balancesFor(clientInvoices);
    const lastLink = links
      .filter((x) => x.client_id === c.id || estateIds.has(x.estate_id))
      .filter((x) => clientEstates.some((e) => e.id === x.estate_id))
      .map((x) => x.updated_at || x.created_at)
      .sort()
      .reverse()[0] ?? null;

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      contactName: c.notes ? null : null,
      projectsCount: projects.length,
      activeProjects: projects.filter((p) => p.project_status === 'active').length,
      plants: projects.reduce((a, p) => a + p.plants, 0),
      waterToday: projects.reduce((a, p) => a + p.waterToday, 0),
      needsReview: projects.reduce((a, p) => a + p.needsReview, 0),
      nextVisit: projects.map((p) => p.nextVisit).filter(Boolean).sort()[0] ?? null,
      openIssues: projects.reduce((a, p) => a + p.openIssues, 0),
      portalActive: projects.some((p) => p.portalActive),
      balances,
      lastCommunicationAt: lastLink,
      projects,
    };
  });

  return rows;
}

export interface ClientInvoiceRow {
  id: string;
  invoice_number: string | null;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  total: number;
  currency: string;
  estate_name?: string | null;
}

export interface ClientCommunication {
  id: string;
  at: string;
  kind: 'portal_created' | 'portal_updated' | 'portal_revoked' | 'manual_approved';
  estate_name: string;
}

export interface ClientDetailData {
  client: { id: string; name: string; email: string | null; phone: string | null; address: string | null; notes: string | null };
  projects: ClientProjectRow[];
  invoices: ClientInvoiceRow[];
  balances: CurrencyBalance[];
  communications: ClientCommunication[];
  portals: {
    id: string;
    estate_id: string;
    estate_name: string;
    revoked_at: string | null;
    expires_at: string | null;
    manual_approved_at: string | null;
    created_at: string;
  }[];
}

export async function fetchClientDetail(orgId: string, clientId: string): Promise<ClientDetailData> {
  const [clientRes, workspace, invoicesRes, linksRes] = await Promise.all([
    supabase.from('clients').select('id, name, email, phone, address, notes').eq('id', clientId).single(),
    fetchClientWorkspace(orgId),
    supabase
      .from('invoices')
      .select('id, invoice_number, status, issue_date, due_date, total, currency')
      .eq('org_id', orgId)
      .eq('client_id', clientId)
      .order('issue_date', { ascending: false }),
    supabase
      .from('estate_share_links')
      .select('id, estate_id, revoked_at, expires_at, manual_approved_at, created_at, updated_at')
      .eq('org_id', orgId),
  ]);
  if (clientRes.error) throw clientRes.error;

  const row = workspace.find((w) => w.id === clientId);
  const projects = row?.projects ?? [];
  const projectIds = new Set(projects.map((p) => p.id));
  const links = ((linksRes.data || []) as any[]).filter((x) => projectIds.has(x.estate_id));
  const nameOf = (id: string) => projects.find((p) => p.id === id)?.name ?? '';

  const communications: ClientCommunication[] = [];
  for (const lk of links) {
    communications.push({ id: `${lk.id}-c`, at: lk.created_at, kind: 'portal_created', estate_name: nameOf(lk.estate_id) });
    if (lk.manual_approved_at)
      communications.push({ id: `${lk.id}-m`, at: lk.manual_approved_at, kind: 'manual_approved', estate_name: nameOf(lk.estate_id) });
    if (lk.revoked_at)
      communications.push({ id: `${lk.id}-r`, at: lk.revoked_at, kind: 'portal_revoked', estate_name: nameOf(lk.estate_id) });
    else if (lk.updated_at && lk.updated_at !== lk.created_at)
      communications.push({ id: `${lk.id}-u`, at: lk.updated_at, kind: 'portal_updated', estate_name: nameOf(lk.estate_id) });
  }
  communications.sort((a, b) => (a.at < b.at ? 1 : -1));

  return {
    client: clientRes.data as any,
    projects,
    invoices: ((invoicesRes.data || []) as any[]).map((i) => ({ ...i, total: Number(i.total || 0) })),
    balances: row?.balances ?? [],
    communications,
    portals: links.map((lk) => ({
      id: lk.id,
      estate_id: lk.estate_id,
      estate_name: nameOf(lk.estate_id),
      revoked_at: lk.revoked_at,
      expires_at: lk.expires_at,
      manual_approved_at: lk.manual_approved_at,
      created_at: lk.created_at,
    })),
  };
}

export async function updateClientContact(
  clientId: string,
  patch: { name?: string; email?: string | null; phone?: string | null; address?: string | null; notes?: string | null },
) {
  const { error } = await supabase.from('clients').update(patch as any).eq('id', clientId);
  if (error) throw error;
}

export async function fetchOrgModules(orgId: string): Promise<Record<CapabilityKey, boolean>> {
  const { data, error } = await supabase.from('organizations').select('modules_json').eq('id', orgId).single();
  if (error) throw error;
  return normalizeOrgModules((data as any)?.modules_json);
}

export async function saveOrgModules(orgId: string, modules: Record<string, boolean>) {
  const { error } = await supabase.from('organizations').update({ modules_json: modules } as any).eq('id', orgId);
  if (error) throw error;
}
