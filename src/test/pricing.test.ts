import { describe, expect, it } from 'vitest';
import {
  ADDONS,
  ANNUAL_MONTHS_CHARGED,
  BASE_PRICE_PER_PROPERTY_USD,
  LEGACY_ADDON_PRICES_USD,
  addonMonthlyUsd,
  addonName,
  quote,
} from '@/lib/pricing';
import {
  ADDON_PRICES_USD,
  LEGACY_ADDON_PRICES_USD as SERVER_LEGACY,
  serverQuote,
} from '../../supabase/functions/_shared/pricing';
import { CRC_PER_USD } from '@/lib/currency';

const EXPECTED: Record<string, number> = {
  field_operations: 8,
  labor: 10,
  reminders: 4,
  inventory: 5,
  client_portal: 6,
  reports_manuals: 6,
  topography: 8,
  financials: 8,
  plant_care: 8,
};

describe('canonical pricing', () => {
  it('exposes exactly the nine public add-ons with the agreed prices', () => {
    expect(ADDONS).toHaveLength(9);
    expect(Object.fromEntries(ADDONS.map((a) => [a.id, a.monthlyUsd]))).toEqual(EXPECTED);
  });

  it('keeps frontend and server tables identical', () => {
    expect(ADDON_PRICES_USD).toEqual(EXPECTED);
    expect(SERVER_LEGACY).toEqual(LEGACY_ADDON_PRICES_USD);
  });

  it('no longer sells plantops', () => {
    expect(ADDONS.some((a) => a.id === 'plantops')).toBe(false);
    expect('plantops' in ADDON_PRICES_USD).toBe(false);
    expect(quote({ interval: 'monthly', propertyCount: 1, addonIds: ['plantops'] })).toMatchObject({
      addonIds: [],
      totalUsd: BASE_PRICE_PER_PROPERTY_USD,
    });
    expect(serverQuote('monthly', 1, ['plantops'], 'USD').totalUsd).toBe(BASE_PRICE_PER_PROPERTY_USD);
  });

  it('still reads historical plantops records', () => {
    expect(addonMonthlyUsd('plantops')).toBe(12);
    expect(addonName('plantops', 'es')).toContain('histórico');
  });

  it('prices every add-on individually and combined', () => {
    for (const [id, price] of Object.entries(EXPECTED)) {
      expect(quote({ interval: 'monthly', propertyCount: 1, addonIds: [id] }).totalUsd).toBe(20 + price);
    }
    const all = Object.keys(EXPECTED);
    expect(quote({ interval: 'monthly', propertyCount: 1, addonIds: all }).totalUsd).toBe(83);
    expect(quote({ interval: 'monthly', propertyCount: 5, addonIds: all }).totalUsd).toBe(163);
  });

  it('charges ten months on annual billing', () => {
    const q = quote({ interval: 'annual', propertyCount: 1, addonIds: ['labor'] });
    expect(q.totalUsd).toBe(30 * ANNUAL_MONTHS_CHARGED);
    expect(q.savingUsd).toBe(30 * (12 - ANNUAL_MONTHS_CHARGED));
  });

  it('matches the server quote in USD and CRC', () => {
    const ids = ['field_operations', 'plant_care', 'reminders'];
    const front = quote({ interval: 'annual', propertyCount: 3, addonIds: ids });
    const usd = serverQuote('annual', 3, ids, 'USD');
    expect(usd.totalUsd).toBe(front.totalUsd);
    expect(usd.amountMinor).toBe(Math.round(front.totalUsd * 100));
    const crc = serverQuote('annual', 3, ids, 'CRC');
    expect(crc.amountMinor).toBe(Math.round(front.totalUsd * CRC_PER_USD) * 100);
  });

  it('ignores invalid and duplicated ids safely', () => {
    expect(serverQuote('monthly', 1, ['nope', 'labor', 'labor'], 'USD')).toMatchObject({
      addonIds: ['labor'],
      totalUsd: 30,
    });
    expect(quote({ interval: 'monthly', propertyCount: 0, addonIds: ['<script>'] }).totalUsd).toBe(20);
  });
});
