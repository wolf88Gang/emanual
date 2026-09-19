/**
 * Single source of truth for what Home Guide sells.
 *
 * Prices are declared in USD. CRC amounts are derived with the fixed rate used
 * everywhere else in the app (src/lib/currency.ts). The same table is mirrored
 * in supabase/functions/_shared/pricing.ts because the amount charged must be
 * computed on the server and never trusted from the browser.
 */
export const BASE_PRICE_PER_PROPERTY_USD = 20;

/** Annual billing charges 10 months instead of 12 (about 17% off). */
export const ANNUAL_MONTHS_CHARGED = 10;

export type BillingInterval = 'monthly' | 'annual';

export interface AddonDefinition {
  id: string;
  /** Monthly price in USD for the whole account (not per property). */
  monthlyUsd: number;
  name: { en: string; es: string; de: string };
  description: { en: string; es: string; de: string };
}

export type AddonGroup = 'operation' | 'management' | 'analysis' | 'specialized';

export const ADDONS: (AddonDefinition & { group: AddonGroup })[] = [
  {
    id: 'field_operations',
    group: 'operation',
    monthlyUsd: 8,
    name: { en: 'Field visits & operations', es: 'Visitas y operación de campo', de: 'Feldbesuche & Betrieb' },
    description: {
      en: 'Field visits, check-ins, guided execution and a record of work done on site.',
      es: 'Visitas de campo, check-ins, ejecución guiada y registro del trabajo realizado en sitio.',
      de: 'Feldbesuche, Check-ins, geführte Ausführung und Protokoll der Arbeit vor Ort.',
    },
  },
  {
    id: 'labor',
    group: 'operation',
    monthlyUsd: 10,
    name: { en: 'Labor & shifts', es: 'Mano de obra y turnos', de: 'Arbeit & Schichten' },
    description: {
      en: 'Shifts, hours, rates, QR check-in and payroll validation.',
      es: 'Turnos, horas, tarifas, check-in con QR y validación de pagos.',
      de: 'Schichten, Stunden, Sätze, QR-Check-in und Lohnprüfung.',
    },
  },
  {
    id: 'reminders',
    group: 'operation',
    monthlyUsd: 4,
    name: { en: 'Reminders & communications', es: 'Recordatorios y comunicaciones', de: 'Erinnerungen & Kommunikation' },
    description: {
      en: 'Operational reminders and scheduled communications based on existing flows.',
      es: 'Recordatorios operativos y comunicaciones programadas según los flujos existentes.',
      de: 'Betriebliche Erinnerungen und geplante Kommunikation auf Basis bestehender Abläufe.',
    },
  },
  {
    id: 'inventory',
    group: 'management',
    monthlyUsd: 5,
    name: { en: 'Inventory & supplies', es: 'Inventario y suministros', de: 'Inventar & Material' },
    description: {
      en: 'Control of tools, supplies and consumables used by the operation.',
      es: 'Control de herramientas, suministros y consumibles utilizados por la operación.',
      de: 'Verwaltung von Werkzeugen, Material und Verbrauchsgütern des Betriebs.',
    },
  },
  {
    id: 'client_portal',
    group: 'management',
    monthlyUsd: 6,
    name: { en: 'Client portals', es: 'Portales de clientes', de: 'Kundenportale' },
    description: {
      en: 'Private views to share operational information with clients without internal access.',
      es: 'Vistas privadas para compartir información operativa con clientes sin dar acceso al espacio interno.',
      de: 'Private Ansichten, um Betriebsinformationen ohne internen Zugang zu teilen.',
    },
  },
  {
    id: 'reports_manuals',
    group: 'management',
    monthlyUsd: 6,
    name: { en: 'Reports & manuals', es: 'Reportes y manuales', de: 'Berichte & Handbücher' },
    description: {
      en: 'Reports, operating manuals and documents prepared from system records.',
      es: 'Reportes, manuales operativos y documentos preparados a partir de los registros del sistema.',
      de: 'Berichte, Betriebshandbücher und Dokumente aus den Systemdaten.',
    },
  },
  {
    id: 'financials',
    group: 'management',
    monthlyUsd: 8,
    name: { en: 'Billing & financials', es: 'Facturación y finanzas', de: 'Abrechnung & Finanzen' },
    description: {
      en: 'Invoicing, charges, expenses and financial records available today.',
      es: 'Facturación, cargos, gastos y registros financieros disponibles actualmente.',
      de: 'Rechnungen, Gebühren, Ausgaben und verfügbare Finanzdaten.',
    },
  },
  {
    id: 'topography',
    group: 'analysis',
    monthlyUsd: 8,
    name: { en: 'Topography & spatial analysis', es: 'Topografía y análisis espacial', de: 'Topografie & räumliche Analyse' },
    description: {
      en: 'KML/KMZ import, elevation profiles, slope and the spatial analysis available today.',
      es: 'Importación KML/KMZ, perfiles de elevación, pendiente y análisis espacial disponible actualmente.',
      de: 'KML/KMZ-Import, Höhenprofile, Neigung und verfügbare räumliche Analyse.',
    },
  },
  {
    id: 'plant_care',
    group: 'specialized',
    monthlyUsd: 8,
    name: { en: 'Plants, placements & care', es: 'Plantas, ubicaciones y cuidados', de: 'Pflanzen, Standorte & Pflege' },
    description: {
      en: 'Plant and pot inventory, placements, care cycles and their related records.',
      es: 'Inventario de plantas y macetas, ubicaciones, ciclos de cuidado y registros asociados.',
      de: 'Pflanzen- und Topfinventar, Standorte, Pflegezyklen und zugehörige Protokolle.',
    },
  },
];

/**
 * Prices for add-on ids that are no longer sold publicly. Kept so historical
 * subscriptions and checkout sessions remain readable; never offered for new
 * purchases and never accepted by quote().
 */
export const LEGACY_ADDON_PRICES_USD: Record<string, number> = { plantops: 12 };

export const LEGACY_ADDON_NAMES: Record<string, { en: string; es: string; de: string }> = {
  plantops: { en: 'Plant operations (legacy)', es: 'Operación de plantas (histórico)', de: 'Pflanzenbetrieb (Verlauf)' },
};

export interface QuoteInput {
  interval: BillingInterval;
  propertyCount: number;
  addonIds: string[];
}

export interface Quote {
  interval: BillingInterval;
  propertyCount: number;
  addonIds: string[];
  /** Monthly recurring value in USD (what the plan is worth per month). */
  monthlyUsd: number;
  /** What is charged now in USD: one month, or ten months for annual. */
  totalUsd: number;
  /** Full-price annual reference used to show the saving. */
  annualListUsd: number;
  savingUsd: number;
}

export function quote({ interval, propertyCount, addonIds }: QuoteInput): Quote {
  const properties = Math.max(1, Math.floor(propertyCount || 1));
  const validAddonIds = addonIds.filter((id) => ADDONS.some((a) => a.id === id));
  const addonMonthly = validAddonIds.reduce(
    (sum, id) => sum + (ADDONS.find((a) => a.id === id)?.monthlyUsd ?? 0),
    0,
  );
  const monthlyUsd = properties * BASE_PRICE_PER_PROPERTY_USD + addonMonthly;
  const annualListUsd = monthlyUsd * 12;
  const totalUsd = interval === 'annual' ? monthlyUsd * ANNUAL_MONTHS_CHARGED : monthlyUsd;

  return {
    interval,
    propertyCount: properties,
    addonIds: validAddonIds,
    monthlyUsd,
    totalUsd,
    annualListUsd,
    savingUsd: interval === 'annual' ? annualListUsd - totalUsd : 0,
  };
}

export function addonName(id: string, language: string): string {
  const addon = ADDONS.find((a) => a.id === id);
  const name = addon?.name ?? LEGACY_ADDON_NAMES[id];
  if (!name) return id;
  return language === 'es' ? name.es : language === 'de' ? name.de : name.en;
}

/** Monthly USD price for any id, including historical ones, for read-only display. */
export function addonMonthlyUsd(id: string): number {
  return ADDONS.find((a) => a.id === id)?.monthlyUsd ?? LEGACY_ADDON_PRICES_USD[id] ?? 0;
}
