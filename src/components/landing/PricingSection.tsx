import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ADDONS, ANNUAL_MONTHS_CHARGED, BASE_PRICE_PER_PROPERTY_USD, quote, type BillingInterval } from '@/lib/pricing';
import { CRC_PER_USD } from '@/lib/currency';
import { MODULE_LIST, type ModuleKey } from '@/lib/homeGuideModules';
import { LandingSectionHeading, HGReveal } from './motion';
import type { landingCopy, LandingLanguage } from './copy';

type Copy = (typeof landingCopy)[LandingLanguage]['pricing'];
type Currency = 'USD' | 'CRC';

const OPTIONAL_ADDON_IDS = ['labor', 'topography', 'financials'];
const SPECIALIZED_CONFIGURATION_IDS = ['plantops'];
const CAPABILITY_GROUPS: Array<{ labelKey: string; moduleKeys: ModuleKey[] }> = [
  { labelKey: 'capabilityCore', moduleKeys: ['clients', 'projects', 'assets', 'documents'] },
  { labelKey: 'capabilityField', moduleKeys: ['map', 'tasks', 'visits', 'tools', 'inventory', 'labor'] },
  { labelKey: 'capabilityCare', moduleKeys: ['plants_pots', 'care', 'reminders', 'rentals'] },
  { labelKey: 'capabilityAdmin', moduleKeys: ['manuals', 'client_portal', 'billing_payments'] },
];

export function PricingSection({ copy, language }: { copy: Copy; language: LandingLanguage }) {
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [propertyCount, setPropertyCount] = useState(1);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const estimate = useMemo(() => quote({ interval, propertyCount, addonIds }), [interval, propertyCount, addonIds]);
  const text = (key: string) => copy[key] as string;
  const items = copy.includedItems as string[];
  const local = <T extends { en: string; es: string; de: string }>(value: T) => value[language];
  const money = (usd: number) => currency === 'CRC' ? `₡${Math.round(usd * CRC_PER_USD).toLocaleString('es-CR')}` : `$${usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  const toggleAddon = (id: string) => setAddonIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const addonById = (id: string) => ADDONS.find((addon) => addon.id === id);
  const addonName = (id: string) => {
    const addon = addonById(id);
    if (!addon) return id;
    return id === 'plantops' ? text('plantServicesName') : local(addon.name);
  };
  const addonDescription = (id: string) => {
    const addon = addonById(id);
    if (!addon) return '';
    return id === 'plantops' ? text('plantServicesDescription') : local(addon.description);
  };
  const renderAddon = (id: string) => {
    const addon = addonById(id);
    if (!addon) return null;
    const selected = addonIds.includes(id);
    return (
      <Button
        key={id}
        type="button"
        variant="ghost"
        aria-pressed={selected}
        onClick={() => toggleAddon(id)}
        className="addon-row"
        data-selected={selected ? 'true' : 'false'}
      >
        <span className="addon-copy">
          <strong>{addonName(id)}</strong>
          <small>{addonDescription(id)}</small>
        </span>
        <span className="addon-meta">
          <span className="addon-price">+{money(addon.monthlyUsd)}<small>/ {text('accountMonth')}</small></span>
          <span className={selected ? 'addon-check is-selected' : 'addon-check'} aria-hidden="true">{selected && <Check />}</span>
        </span>
      </Button>
    );
  };

  return (
    <section id="pricing" className="landing-section scroll-mt-28" aria-labelledby="pricing-title">
      <div className="landing-shell">
        <LandingSectionHeading eyebrow={text('eyebrow')} title={text('title')} subtitle={text('body')} className="max-w-3xl" />
        <HGReveal className="pricing-editorial" delay={110}>
          <div className="pricing-controls">
            <div className="pricing-toolbar">
              <div className="landing-segmented" aria-label={text('eyebrow')}>
                <Button size="sm" variant={interval === 'monthly' ? 'default' : 'ghost'} aria-pressed={interval === 'monthly'} onClick={() => setInterval('monthly')}>{text('monthly')}</Button>
                <Button size="sm" variant={interval === 'annual' ? 'default' : 'ghost'} aria-pressed={interval === 'annual'} onClick={() => setInterval('annual')}>{text('annual')}</Button>
              </div>
              <div className="landing-segmented" aria-label="Currency">
                <Button size="sm" variant={currency === 'USD' ? 'secondary' : 'ghost'} aria-pressed={currency === 'USD'} onClick={() => setCurrency('USD')}>USD</Button>
                <Button size="sm" variant={currency === 'CRC' ? 'secondary' : 'ghost'} aria-pressed={currency === 'CRC'} onClick={() => setCurrency('CRC')}>CRC</Button>
              </div>
            </div>
            <div className="property-control">
              <div><p className="font-semibold">{text('properties')}</p><p className="mt-1 text-sm text-muted-foreground">{money(BASE_PRICE_PER_PROPERTY_USD)} {text('perProperty')}</p></div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" aria-label={text('decrease')} onClick={() => setPropertyCount((value) => Math.max(1, value - 1))}><Minus /></Button>
                <span className="w-9 text-center font-display text-xl font-semibold tabular-nums" aria-live="polite">{propertyCount}</span>
                <Button variant="outline" size="icon" aria-label={text('increase')} onClick={() => setPropertyCount((value) => Math.min(500, value + 1))}><Plus /></Button>
              </div>
            </div>
            <div className="addon-list">
              <fieldset className="pricing-option-group">
                <legend>{text('extras')}</legend>
                <p>{text('extrasBody')}</p>
                <div>{OPTIONAL_ADDON_IDS.map(renderAddon)}</div>
              </fieldset>
              <fieldset className="pricing-option-group specialized-configuration">
                <legend>{text('specializedConfiguration')}</legend>
                <p>{text('specializedConfigurationBody')}</p>
                <div>{SPECIALIZED_CONFIGURATION_IDS.map(renderAddon)}</div>
              </fieldset>
            </div>
          </div>
          <aside className="pricing-summary">
            <div>
              <p className="landing-eyebrow">{text('summary')}</p>
              <div className="pricing-total"><span>{money(estimate.totalUsd)}</span><small>{interval === 'annual' ? text('dueAnnual') : text('dueMonthly')}</small></div>
              {interval === 'annual' && <p className="pricing-saving">{text('annualNote')} · {text('saving')}: {money(estimate.savingUsd)}</p>}
              <div className="pricing-included"><p>{text('included')}</p><ul>{items.map((item) => <li key={item}><Check />{item}</li>)}</ul></div>
            </div>
            <Button asChild size="lg" className="w-full"><Link to="/auth?mode=signup">{text('continue')}<ArrowRight /></Link></Button>
          </aside>
        </HGReveal>
        <HGReveal className="pricing-catalog" delay={140}>
          <div className="pricing-catalog-head">
            <div>
              <h3>{text('catalogTitle')}</h3>
              <p>{text('catalogBody')}</p>
            </div>
            <p className="pricing-catalog-note">{text('catalogNote')}</p>
          </div>
          <div className="pricing-capability-groups">
            {CAPABILITY_GROUPS.map((group) => (
              <section key={group.labelKey} className="pricing-capability-group">
                <h4>{text(group.labelKey)}</h4>
                <ul>
                  {group.moduleKeys.map((moduleKey) => {
                    const mod = MODULE_LIST.find((item) => item.key === moduleKey);
                    if (!mod) return null;
                    return <li key={mod.key}><strong>{mod.label[language]}</strong><p>{mod.description[language]}</p></li>;
                  })}
                </ul>
              </section>
            ))}
          </div>
        </HGReveal>
        <p className="sr-only">{ANNUAL_MONTHS_CHARGED}</p>
      </div>
    </section>
  );
}
