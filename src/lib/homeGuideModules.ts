import {
  Users, FolderKanban, Box, Sprout, Droplets, BellRing, ClipboardList, Wrench,
  BookOpen, Globe, Receipt, FileSignature, CalendarDays, FolderOpen, Package,
  Map as MapIcon, ListChecks,
} from 'lucide-react';

import type { ComponentType } from 'react';

/**
 * ONE canonical module source for Home Guide.
 *
 * Modules are behaviour groups a company can switch on or off — never routes.
 * Enabled modules live in `organizations.modules_json` as
 * `{ "<module key>": true | false }`. Project-level capabilities
 * (`estates.plantops_service_plan_json.capabilities`) use the same keys and can
 * never exceed the organization modules.
 */

export const MODULE_KEYS = [
  'clients',
  'projects',
  'assets',
  'map',
  'tasks',
  'plants_pots',
  'care',
  'reminders',
  'visits',
  'tools',
  'manuals',
  'client_portal',
  'billing_payments',
  'rentals',
  'events',
  'documents',
  'inventory',
] as const;


export type ModuleKey = (typeof MODULE_KEYS)[number];

export type ModuleRole = 'owner' | 'manager' | 'crew' | 'vendor' | 'client';

export interface DashboardWidget {
  /** Stable widget id (module scoped). */
  id: string;
  label: { en: string; es: string; de: string };
  /** Where the KPI opens its underlying records. */
  route: string;
}

export interface ModuleDefinition {
  key: ModuleKey;
  label: { en: string; es: string; de: string };
  description: { en: string; es: string; de: string };
  icon: ComponentType<{ className?: string }>;
  /** Routes owned by this module — blocked when the module is off. */
  routes: string[];
  /** Primary navigation entry (when the module has one). */
  navRoute?: string;
  allowedRoles: ModuleRole[];
  /** Other modules that must be enabled for this one to work. */
  dependencies: ModuleKey[];
  dashboardWidgets: DashboardWidget[];
  /** Project-level capability toggle available. */
  projectCapability: boolean;
}

const L = (en: string, es: string, de: string) => ({ en, es, de });

export const MODULES: Record<ModuleKey, ModuleDefinition> = {
  clients: {
    key: 'clients',
    label: L('Clients', 'Clientes', 'Kunden'),
    description: L(
      'Client records, contacts and communications.',
      'Fichas de clientes, contactos y comunicaciones.',
      'Kundenakten, Kontakte und Kommunikation.',
    ),
    icon: Users,
    routes: ['/clients', '/plantops/clientes', '/plantops/nuevo-cliente'],
    navRoute: '/clients',

    allowedRoles: ['owner', 'manager'],
    dependencies: [],
    dashboardWidgets: [{ id: 'clients.active', label: L('Active clients', 'Clientes activos', 'Aktive Kunden'), route: '/plantops/clientes' }],
    projectCapability: false,
  },
  projects: {
    key: 'projects',
    label: L('Projects', 'Proyectos', 'Projekte'),
    description: L(
      'Properties or sites served for each client.',
      'Propiedades o sitios atendidos de cada cliente.',
      'Objekte oder Standorte pro Kunde.',
    ),
    icon: FolderKanban,
    routes: ['/plantops/propiedad', '/estates'],
    navRoute: '/plantops/clientes',
    allowedRoles: ['owner', 'manager'],
    dependencies: ['clients'],
    dashboardWidgets: [{ id: 'projects.active', label: L('Active projects', 'Proyectos activos', 'Aktive Projekte'), route: '/plantops/clientes' }],
    projectCapability: false,
  },
  assets: {
    key: 'assets',
    label: L('Assets', 'Activos', 'Anlagen'),
    description: L(
      'Asset registry: what exists, where it is and its condition.',
      'Registro de activos: qué existe, dónde está y en qué estado.',
      'Anlagenregister: was existiert, wo es ist und in welchem Zustand.',
    ),
    icon: Box,
    routes: ['/assets', '/plants'],
    navRoute: '/assets',
    allowedRoles: ['owner', 'manager', 'crew'],
    dependencies: [],
    dashboardWidgets: [],
    projectCapability: true,
  },
  map: {
    key: 'map',
    label: L('Map & zones', 'Mapa y zonas', 'Karte & Zonen'),
    description: L(
      'Spatial map, zones and GPS positioning.',
      'Mapa espacial, zonas y ubicación GPS.',
      'Räumliche Karte, Zonen und GPS-Position.',
    ),
    icon: MapIcon,
    routes: ['/map', '/topography'],
    navRoute: '/map',
    allowedRoles: ['owner', 'manager', 'crew'],
    dependencies: [],
    dashboardWidgets: [],
    projectCapability: true,
  },
  tasks: {
    key: 'tasks',
    label: L('Tasks', 'Tareas', 'Aufgaben'),
    description: L(
      'Work orders and maintenance obligations.',
      'Órdenes de trabajo y obligaciones de mantenimiento.',
      'Arbeitsaufträge und Wartungspflichten.',
    ),
    icon: ListChecks,
    routes: ['/tasks'],
    navRoute: '/tasks',
    allowedRoles: ['owner', 'manager', 'crew'],
    dependencies: [],
    dashboardWidgets: [{ id: 'tasks.open', label: L('Open tasks', 'Tareas abiertas', 'Offene Aufgaben'), route: '/tasks' }],
    projectCapability: true,
  },

  plants_pots: {
    key: 'plants_pots',
    label: L('Plants & pots', 'Plantas y macetas', 'Pflanzen & Töpfe'),
    description: L(
      'Plant and pot inventory, placements and lifecycle.',
      'Inventario de plantas y macetas, ubicaciones y ciclo de vida.',
      'Pflanzen- und Topfbestand, Standorte und Lebenszyklus.',
    ),
    icon: Sprout,
    routes: ['/plantops'],
    navRoute: '/plantops',
    allowedRoles: ['owner', 'manager', 'crew'],
    dependencies: [],
    dashboardWidgets: [{ id: 'plants.installed', label: L('Installed plants', 'Plantas instaladas', 'Installierte Pflanzen'), route: '/plantops' }],
    projectCapability: true,
  },
  care: {
    key: 'care',
    label: L('Care', 'Cuidados', 'Pflege'),
    description: L(
      'Watering intervals, care plans and care logs.',
      'Intervalos de riego, planes de cuidado y registros.',
      'Gießintervalle, Pflegepläne und Protokolle.',
    ),
    icon: Droplets,
    routes: ['/plantops/care', '/plantops/cuidados'],
    navRoute: '/plantops/care',
    allowedRoles: ['owner', 'manager', 'crew'],
    dependencies: [],
    dashboardWidgets: [
      { id: 'care.today', label: L('Water today', 'Regar hoy', 'Heute gießen'), route: '/plantops/care' },
      { id: 'care.review', label: L('Needs review', 'Requiere revisión', 'Prüfung nötig'), route: '/plantops/care' },
    ],
    projectCapability: true,
  },
  reminders: {
    key: 'reminders',
    label: L('Reminders', 'Recordatorios', 'Erinnerungen'),
    description: L(
      'Client reminders by email or WhatsApp, manual or automatic.',
      'Recordatorios al cliente por correo o WhatsApp, manuales o automáticos.',
      'Kundenerinnerungen per E-Mail oder WhatsApp, manuell oder automatisch.',
    ),
    icon: BellRing,
    routes: ['/plantops/reminders'],
    navRoute: '/plantops/reminders',
    allowedRoles: ['owner', 'manager'],
    dependencies: ['clients'],
    dashboardWidgets: [
      { id: 'reminders.pending', label: L('Pending reminders', 'Recordatorios pendientes', 'Offene Erinnerungen'), route: '/plantops/reminders' },
      { id: 'reminders.blocked', label: L('Blocked reminders', 'Recordatorios bloqueados', 'Blockierte Erinnerungen'), route: '/plantops/reminders?status=blocked' },
    ],
    projectCapability: true,
  },
  visits: {
    key: 'visits',
    label: L('Visits', 'Visitas', 'Besuche'),
    description: L(
      'Field visit runner with evidence and check-ins.',
      'Ejecución de visitas de campo con evidencia y registros.',
      'Feldbesuche mit Nachweisen und Check-ins.',
    ),
    icon: ClipboardList,
    routes: ['/plantops/visita', '/checkin'],
    navRoute: '/plantops/visita',
    allowedRoles: ['owner', 'manager', 'crew'],
    dependencies: [],
    dashboardWidgets: [{ id: 'visits.upcoming', label: L('Upcoming visits', 'Próximas visitas', 'Kommende Besuche'), route: '/plantops/visita' }],
    projectCapability: true,
  },
  tools: {
    key: 'tools',
    label: L('Tools', 'Herramientas', 'Werkzeuge'),
    description: L(
      'Tool assignment and return per visit.',
      'Asignación y devolución de herramientas por visita.',
      'Werkzeugausgabe und Rückgabe pro Besuch.',
    ),
    icon: Wrench,
    routes: [],
    allowedRoles: ['owner', 'manager', 'crew'],
    dependencies: ['visits'],
    dashboardWidgets: [],
    projectCapability: true,
  },
  manuals: {
    key: 'manuals',
    label: L('Manuals', 'Manuales', 'Handbücher'),
    description: L(
      'Care manuals, approval and reports.',
      'Manuales de cuidado, aprobación y reportes.',
      'Pflegehandbücher, Freigabe und Berichte.',
    ),
    icon: BookOpen,
    routes: ['/reports'],
    allowedRoles: ['owner', 'manager'],
    dependencies: [],
    dashboardWidgets: [],
    projectCapability: true,
  },
  client_portal: {
    key: 'client_portal',
    label: L('Client portal', 'Portal del cliente', 'Kundenportal'),
    description: L(
      'Login-free portal links for clients.',
      'Enlaces de portal sin cuenta para los clientes.',
      'Portal-Links für Kunden ohne Konto.',
    ),
    icon: Globe,
    routes: [],
    allowedRoles: ['owner', 'manager'],
    dependencies: ['clients'],
    dashboardWidgets: [],
    projectCapability: true,
  },
  billing_payments: {
    key: 'billing_payments',
    label: L('Billing & payments', 'Facturación y pagos', 'Abrechnung & Zahlungen'),
    description: L(
      'Charges, invoices and payment records.',
      'Cargos, facturas y registro de pagos.',
      'Posten, Rechnungen und Zahlungen.',
    ),
    icon: Receipt,
    routes: ['/crm', '/financials'],
    navRoute: '/crm',
    allowedRoles: ['owner', 'manager'],
    dependencies: ['clients'],
    dashboardWidgets: [{ id: 'billing.overdue', label: L('Overdue invoices', 'Facturas vencidas', 'Überfällige Rechnungen'), route: '/crm' }],
    projectCapability: true,
  },
  rentals: {
    key: 'rentals',
    label: L('Rentals', 'Alquileres', 'Vermietung'),
    description: L(
      'Rental contracts and rotation cycles.',
      'Contratos de alquiler y ciclos de rotación.',
      'Mietverträge und Rotationszyklen.',
    ),
    icon: FileSignature,
    routes: ['/plantops/contracts'],
    navRoute: '/plantops/contracts',
    allowedRoles: ['owner', 'manager'],
    dependencies: ['clients'],
    dashboardWidgets: [],
    projectCapability: true,
  },
  events: {
    key: 'events',
    label: L('Events', 'Eventos', 'Events'),
    description: L(
      'Short-term event installations.',
      'Instalaciones temporales para eventos.',
      'Kurzfristige Event-Installationen.',
    ),
    icon: CalendarDays,
    routes: [],
    allowedRoles: ['owner', 'manager'],
    dependencies: ['rentals'],
    dashboardWidgets: [],
    projectCapability: true,
  },
  documents: {
    key: 'documents',
    label: L('Documents', 'Documentos', 'Dokumente'),
    description: L(
      'File storage per client and project.',
      'Archivos por cliente y proyecto.',
      'Dateien pro Kunde und Projekt.',
    ),
    icon: FolderOpen,
    routes: ['/documents'],
    navRoute: '/documents',
    allowedRoles: ['owner', 'manager'],
    dependencies: [],
    dashboardWidgets: [],
    projectCapability: true,
  },
  inventory: {
    key: 'inventory',
    label: L('Inventory', 'Inventario', 'Inventar'),
    description: L(
      'Tools, supplies and consumables stock.',
      'Herramientas, suministros y consumibles.',
      'Werkzeuge, Material und Verbrauchsgüter.',
    ),
    icon: Package,
    routes: ['/inventory'],
    navRoute: '/inventory',
    allowedRoles: ['owner', 'manager'],
    dependencies: [],
    dashboardWidgets: [],
    projectCapability: false,
  },
};

export const MODULE_LIST: ModuleDefinition[] = MODULE_KEYS.map((k) => MODULES[k]);

/** Project-level toggles (subset of org modules). */
export const PROJECT_MODULE_KEYS: ModuleKey[] = MODULE_LIST.filter((m) => m.projectCapability).map((m) => m.key);

/**
 * Minimal core: a business only needs clients and projects to be usable.
 * Everything else is opt-in and must be selected explicitly.
 */
export const DEFAULT_MODULES: Record<ModuleKey, boolean> = {
  clients: true,
  projects: true,
  assets: false,
  map: false,
  tasks: false,
  plants_pots: false,
  care: false,
  reminders: false,
  visits: false,
  tools: false,
  manuals: false,
  client_portal: false,
  billing_payments: false,
  rentals: false,
  events: false,
  documents: false,
  inventory: false,
};

export function normalizeModules(
  raw: Record<string, unknown> | null | undefined,
  fallback: Record<ModuleKey, boolean> = DEFAULT_MODULES,
): Record<ModuleKey, boolean> {
  const out = { ...fallback };
  if (raw && typeof raw === 'object') {
    for (const k of MODULE_KEYS) if (k in raw) out[k] = !!(raw as Record<string, unknown>)[k];
  }
  return out;
}

/**
 * Dependencies are enforced: a module without its dependency is not usable.
 * `fallback` covers organizations that never saved a configuration (legacy
 * accounts keep the module set implied by their archetype).
 */
export function resolveModules(
  raw: Record<string, unknown> | null | undefined,
  fallback: Record<ModuleKey, boolean> = DEFAULT_MODULES,
): Record<ModuleKey, boolean> {
  const flags = normalizeModules(raw, fallback);
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of MODULE_LIST) {
      if (flags[m.key] && m.dependencies.some((d) => !flags[d])) {
        flags[m.key] = false;
        changed = true;
      }
    }
  }
  return flags;
}


/** The module that owns a route, if any. Longest prefix wins. */
export function moduleForRoute(pathname: string): ModuleDefinition | null {
  let best: ModuleDefinition | null = null;
  let bestLen = -1;
  for (const m of MODULE_LIST) {
    for (const r of m.routes) {
      if ((pathname === r || pathname.startsWith(`${r}/`)) && r.length > bestLen) {
        best = m;
        bestLen = r.length;
      }
    }
  }
  return best;
}

/* --------------------------- presets --------------------------- */

export type PresetKey = 'plant_care_lite' | 'field_service' | 'rental_operations' | 'custom';

export interface OperationPreset {
  key: PresetKey;
  label: { en: string; es: string; de: string };
  description: { en: string; es: string; de: string };
  /** null = manual selection (custom). */
  modules: Record<ModuleKey, boolean> | null;
}

const preset = (enabled: ModuleKey[]): Record<ModuleKey, boolean> => {
  const out = {} as Record<ModuleKey, boolean>;
  for (const k of MODULE_KEYS) out[k] = enabled.includes(k);
  return out;
};

export const PRESETS: OperationPreset[] = [
  {
    key: 'plant_care_lite',
    label: L('Plant Care Lite', 'Cuidado de plantas simple', 'Pflanzenpflege Lite'),
    description: L(
      'Clients, plants, care and reminders only.',
      'Solo clientes, plantas, cuidados y recordatorios.',
      'Nur Kunden, Pflanzen, Pflege und Erinnerungen.',
    ),
    modules: preset(['clients', 'projects', 'plants_pots', 'care', 'reminders', 'client_portal', 'manuals']),
  },
  {
    key: 'field_service',
    label: L('Field Service', 'Servicio de campo', 'Außendienst'),
    description: L(
      'Visits, tools and billing for crews on site.',
      'Visitas, herramientas y facturación para equipos en sitio.',
      'Besuche, Werkzeuge und Abrechnung für Teams vor Ort.',
    ),
    modules: preset([
      'clients', 'projects', 'assets', 'care', 'visits', 'tools', 'reminders', 'billing_payments', 'client_portal', 'manuals',
    ]),
  },
  {
    key: 'rental_operations',
    label: L('Rental Operations', 'Operación de alquiler', 'Mietbetrieb'),
    description: L(
      'Full plant rental operation with contracts.',
      'Operación completa de alquiler de plantas con contratos.',
      'Vollständiger Pflanzenmietbetrieb mit Verträgen.',
    ),
    modules: preset([
      'clients', 'projects', 'assets', 'plants_pots', 'care', 'reminders', 'visits', 'tools', 'rentals',
      'billing_payments', 'client_portal', 'manuals',
    ]),
  },
  {
    key: 'custom',
    label: L('Custom', 'Personalizado', 'Individuell'),
    description: L('Choose every module manually.', 'Elija cada módulo manualmente.', 'Jedes Modul manuell wählen.'),
    modules: null,
  },
];

export function moduleLabel(key: ModuleKey, language: string): string {
  const l = MODULES[key].label;
  return language === 'es' ? l.es : language === 'de' ? l.de : l.en;
}

export function moduleDescription(key: ModuleKey, language: string): string {
  const d = MODULES[key].description;
  return language === 'es' ? d.es : language === 'de' ? d.de : d.en;
}

export function widgetLabel(w: DashboardWidget, language: string): string {
  return language === 'es' ? w.label.es : language === 'de' ? w.label.de : w.label.en;
}
