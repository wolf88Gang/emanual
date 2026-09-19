/**
 * Server-side price table. The browser only sends WHAT was selected
 * (interval, property count, add-on ids); the amount charged is always
 * computed here so a manipulated request cannot lower the price.
 *
 * Keep in sync with src/lib/pricing.ts and src/lib/currency.ts.
 */
export const BASE_PRICE_PER_PROPERTY_USD = 20;
export const ANNUAL_MONTHS_CHARGED = 10;
export const CRC_PER_USD = 520;

export const ADDON_PRICES_USD: Record<string, number> = {
  labor: 10,
  plantops: 12,
  topography: 8,
  financials: 8,
};

export type BillingInterval = "monthly" | "annual";
export type Currency = "USD" | "CRC";

export interface ServerQuote {
  interval: BillingInterval;
  propertyCount: number;
  addonIds: string[];
  monthlyUsd: number;
  totalUsd: number;
  currency: Currency;
  /** Amount in the currency's minor unit, which is what ONVO expects. */
  amountMinor: number;
}

export function serverQuote(
  interval: BillingInterval,
  propertyCount: number,
  addonIds: string[],
  currency: Currency,
): ServerQuote {
  const properties = Math.max(1, Math.min(500, Math.floor(propertyCount || 1)));
  const validAddonIds = [...new Set(addonIds)].filter((id) => id in ADDON_PRICES_USD);
  const addonMonthly = validAddonIds.reduce((sum, id) => sum + ADDON_PRICES_USD[id], 0);
  const monthlyUsd = properties * BASE_PRICE_PER_PROPERTY_USD + addonMonthly;
  const totalUsd = interval === "annual" ? monthlyUsd * ANNUAL_MONTHS_CHARGED : monthlyUsd;
  const total = currency === "CRC" ? Math.round(totalUsd * CRC_PER_USD) : totalUsd;

  return {
    interval,
    propertyCount: properties,
    addonIds: validAddonIds,
    monthlyUsd,
    totalUsd,
    currency,
    amountMinor: Math.round(total * 100),
  };
}

export function periodEnd(interval: BillingInterval, from = new Date()): Date {
  const end = new Date(from);
  if (interval === "annual") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}
