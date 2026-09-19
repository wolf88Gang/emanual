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

export const ADDONS: AddonDefinition[] = [
  {
    id: 'labor',
    monthlyUsd: 10,
    name: { en: 'Labor & shifts', es: 'Mano de obra y turnos', de: 'Arbeit & Schichten' },
    description: {
      en: 'QR check-in, shift validation and payroll rates in USD or colones.',
      es: 'Check-in con QR, validación de turnos y tarifas de pago en dólares o colones.',
      de: 'QR-Check-in, Schichtprüfung und Lohnsätze in USD oder Colones.',
    },
  },
  {
    id: 'plantops',
    monthlyUsd: 12,
    name: { en: 'Plant rental operations', es: 'Operación de alquiler de plantas', de: 'Pflanzenvermietung' },
    description: {
      en: 'Placements, rotations, replacements, visit runner and client portals.',
      es: 'Colocaciones, rotaciones, reemplazos, ruta de visita y portales de cliente.',
      de: 'Platzierungen, Rotationen, Ersatz, Besuchsablauf und Kundenportale.',
    },
  },
  {
    id: 'topography',
    monthlyUsd: 8,
    name: { en: 'Topography & risk', es: 'Topografía y riesgo', de: 'Topografie & Risiko' },
    description: {
      en: 'KML/KMZ import, elevation transects and slope layers.',
      es: 'Importación KML/KMZ, transectos de elevación y capas de pendiente.',
      de: 'KML/KMZ-Import, Höhenprofile und Neigungsebenen.',
    },
  },
  {
    id: 'financials',
    monthlyUsd: 8,
    name: { en: 'Invoicing & financials', es: 'Facturación y finanzas', de: 'Rechnungen & Finanzen' },
    description: {
      en: 'Owner invoices, expense tracking and tax jurisdictions.',
      es: 'Facturas a propietarios, control de gastos y jurisdicciones fiscales.',
      de: 'Eigentümerrechnungen, Ausgabenerfassung und Steuerzonen.',
    },
  },
];

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
  if (!addon) return id;
  return language === 'es' ? addon.name.es : language === 'de' ? addon.name.de : addon.name.en;
}
