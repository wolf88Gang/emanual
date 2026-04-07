import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, Plus, Search, Loader2, Download, Receipt, TrendingUp, TrendingDown,
  Calculator, FileText, Filter, Trash2, Edit2, Upload, Building2, Globe2
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/currency';

// --- Tax category definitions ---
const US_TAX_CATEGORIES = [
  { value: 'property_tax', en: 'Property Tax', es: 'Impuesto de Propiedad', de: 'Grundsteuer' },
  { value: 'mortgage_interest', en: 'Mortgage Interest', es: 'Interés Hipotecario', de: 'Hypothekenzinsen' },
  { value: 'property_maintenance', en: 'Property Maintenance', es: 'Mantenimiento de Propiedad', de: 'Instandhaltung' },
  { value: 'depreciation', en: 'Depreciation', es: 'Depreciación', de: 'Abschreibung' },
  { value: 'insurance', en: 'Insurance', es: 'Seguro', de: 'Versicherung' },
  { value: 'repairs', en: 'Repairs & Improvements', es: 'Reparaciones y Mejoras', de: 'Reparaturen' },
  { value: 'utilities', en: 'Utilities', es: 'Servicios Públicos', de: 'Nebenkosten' },
  { value: 'hoa_fees', en: 'HOA Fees', es: 'Cuotas HOA', de: 'Hausgeld' },
  { value: 'landscaping', en: 'Landscaping Services', es: 'Servicios de Jardinería', de: 'Landschaftspflege' },
  { value: 'pest_control', en: 'Pest Control', es: 'Control de Plagas', de: 'Schädlingsbekämpfung' },
  { value: 'home_office', en: 'Home Office Deduction', es: 'Deducción de Oficina', de: 'Home-Office' },
  { value: 'rental_income', en: 'Rental Income', es: 'Ingreso por Alquiler', de: 'Mieteinnahmen' },
  { value: 'capital_gains', en: 'Capital Gains', es: 'Ganancias de Capital', de: 'Kapitalgewinne' },
  { value: 'other', en: 'Other', es: 'Otro', de: 'Sonstige' },
];

const CR_TAX_CATEGORIES = [
  { value: 'impuesto_bienes', en: 'Property Tax (Bienes Inmuebles)', es: 'Impuesto de Bienes Inmuebles', de: 'Grundsteuer (Bienes Inmuebles)' },
  { value: 'iva_13', en: 'IVA (13%)', es: 'IVA (13%)', de: 'MwSt (13%)' },
  { value: 'municipal_tax', en: 'Municipal Tax (Patente)', es: 'Impuesto Municipal (Patente)', de: 'Gemeindesteuer' },
  { value: 'income_tax', en: 'Income Tax (Renta)', es: 'Impuesto sobre la Renta', de: 'Einkommensteuer' },
  { value: 'luxury_tax', en: 'Luxury Home Tax (Solidario)', es: 'Impuesto Solidario (Casas de Lujo)', de: 'Luxussteuer' },
  { value: 'ccss', en: 'Social Security (CCSS)', es: 'Seguro Social (CCSS)', de: 'Sozialversicherung (CCSS)' },
  { value: 'property_maintenance', en: 'Property Maintenance', es: 'Mantenimiento', de: 'Instandhaltung' },
  { value: 'insurance', en: 'Insurance (INS)', es: 'Seguro (INS)', de: 'Versicherung (INS)' },
  { value: 'landscaping', en: 'Landscaping Services', es: 'Servicios de Jardinería', de: 'Landschaftspflege' },
  { value: 'utilities', en: 'Utilities (ICE/AyA)', es: 'Servicios (ICE/AyA)', de: 'Nebenkosten (ICE/AyA)' },
  { value: 'rental_income', en: 'Rental Income', es: 'Ingreso por Alquiler', de: 'Mieteinnahmen' },
  { value: 'condominium_fees', en: 'Condominium Fees', es: 'Cuota de Condominio', de: 'Eigentümergebühren' },
  { value: 'other', en: 'Other', es: 'Otro', de: 'Sonstige' },
];

// US tax brackets 2026 (approximate)
const US_TAX_BRACKETS = [
  { min: 0, max: 11600, rate: 0.10 },
  { min: 11600, max: 47150, rate: 0.12 },
  { min: 47150, max: 100525, rate: 0.22 },
  { min: 100525, max: 191950, rate: 0.24 },
  { min: 191950, max: 243725, rate: 0.32 },
  { min: 243725, max: 609350, rate: 0.35 },
  { min: 609350, max: Infinity, rate: 0.37 },
];

// CR tax brackets (annual, in CRC)
const CR_TAX_BRACKETS = [
  { min: 0, max: 4536000, rate: 0 },
  { min: 4536000, max: 6780000, rate: 0.10 },
  { min: 6780000, max: 11316000, rate: 0.15 },
  { min: 11316000, max: 22632000, rate: 0.20 },
  { min: 22632000, max: Infinity, rate: 0.25 },
];

function calculateProgressiveTax(income: number, brackets: typeof US_TAX_BRACKETS): number {
  let tax = 0;
  let remaining = income;
  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.max - bracket.min);
    tax += taxable * bracket.rate;
    remaining -= taxable;
  }
  return tax;
}

interface FinancialEntry {
  id: string;
  entry_type: 'income' | 'expense';
  tax_jurisdiction: 'US' | 'CR';
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  notes: string | null;
  receipt_url: string | null;
  entry_date: string;
  is_deductible: boolean;
  tax_year: number;
  vendor_name: string | null;
}

export default function Financials() {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const { profile } = useAuth();
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('overview');

  // Detect jurisdiction from estate country
  const defaultJurisdiction: 'US' | 'CR' = currentEstate?.country === 'CR' ? 'CR' : 'US';

  const l = (en: string, es: string, de: string) => language === 'es' ? es : language === 'de' ? de : en;
  const categories = defaultJurisdiction === 'CR' ? CR_TAX_CATEGORIES : US_TAX_CATEGORIES;
  const catLabel = (cat: string) => {
    const found = [...US_TAX_CATEGORIES, ...CR_TAX_CATEGORIES].find(c => c.value === cat);
    if (!found) return cat;
    return language === 'es' ? found.es : language === 'de' ? found.de : found.en;
  };

  useEffect(() => { fetchEntries(); }, [profile?.org_id, selectedYear]);

  async function fetchEntries() {
    if (!profile?.org_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('financial_entries')
        .select('*')
        .eq('org_id', profile.org_id)
        .eq('tax_year', selectedYear)
        .order('entry_date', { ascending: false });
      if (error) throw error;
      setEntries((data || []) as FinancialEntry[]);
    } finally { setLoading(false); }
  }

  // --- Summary calculations ---
  const yearEntries = useMemo(() => entries.filter(e => e.tax_year === selectedYear), [entries, selectedYear]);
  const totalIncome = useMemo(() => yearEntries.filter(e => e.entry_type === 'income').reduce((s, e) => s + Number(e.amount), 0), [yearEntries]);
  const totalExpenses = useMemo(() => yearEntries.filter(e => e.entry_type === 'expense').reduce((s, e) => s + Number(e.amount), 0), [yearEntries]);
  const totalDeductible = useMemo(() => yearEntries.filter(e => e.is_deductible).reduce((s, e) => s + Number(e.amount), 0), [yearEntries]);
  const taxableIncome = Math.max(0, totalIncome - totalDeductible);
  const estimatedTax = defaultJurisdiction === 'US'
    ? calculateProgressiveTax(taxableIncome, US_TAX_BRACKETS)
    : calculateProgressiveTax(taxableIncome, CR_TAX_BRACKETS);
  const currency = defaultJurisdiction === 'CR' ? 'CRC' : 'USD';

  const filteredEntries = useMemo(() => {
    if (!searchQuery) return yearEntries;
    const q = searchQuery.toLowerCase();
    return yearEntries.filter(e =>
      e.description?.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || e.vendor_name?.toLowerCase().includes(q)
    );
  }, [yearEntries, searchQuery]);

  const byCategory = useMemo(() => {
    const map: Record<string, { income: number; expense: number; deductible: number }> = {};
    yearEntries.forEach(e => {
      if (!map[e.category]) map[e.category] = { income: 0, expense: 0, deductible: 0 };
      if (e.entry_type === 'income') map[e.category].income += Number(e.amount);
      else map[e.category].expense += Number(e.amount);
      if (e.is_deductible) map[e.category].deductible += Number(e.amount);
    });
    return Object.entries(map).sort((a, b) => (b[1].expense + b[1].income) - (a[1].expense + a[1].income));
  }, [yearEntries]);

  async function deleteEntry(id: string) {
    const { error } = await supabase.from('financial_entries').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success(l('Entry deleted', 'Entrada eliminada', 'Eintrag gelöscht'));
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <ModernAppLayout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              {l('Financials', 'Finanzas', 'Finanzen')}
            </h1>
            <p className="text-muted-foreground text-sm flex items-center gap-1">
              <Globe2 className="h-3.5 w-3.5" />
              {defaultJurisdiction === 'CR'
                ? l('Costa Rica Tax Tracking', 'Seguimiento Fiscal Costa Rica', 'Costa Rica Steuerverfolgung')
                : l('US Tax Tracking', 'Seguimiento Fiscal EE.UU.', 'US-Steuerverfolgung')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={() => setShowAddDialog(true)} className="gap-2"><Plus className="h-4 w-4" />{l('Add Entry', 'Agregar', 'Hinzufügen')}</Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4 text-green-500" />{l('Income', 'Ingresos', 'Einnahmen')}</div>
            <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(totalIncome, currency)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingDown className="h-4 w-4 text-destructive" />{l('Expenses', 'Gastos', 'Ausgaben')}</div>
            <p className="text-xl font-bold text-destructive mt-1">{formatCurrency(totalExpenses, currency)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Receipt className="h-4 w-4 text-primary" />{l('Deductible', 'Deducible', 'Absetzbar')}</div>
            <p className="text-xl font-bold text-primary mt-1">{formatCurrency(totalDeductible, currency)}</p>
          </CardContent></Card>
          <Card className="border-primary/30"><CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calculator className="h-4 w-4 text-warning" />{l('Est. Tax', 'Imp. Est.', 'Gesch. Steuer')}</div>
            <p className="text-xl font-bold text-warning mt-1">{formatCurrency(estimatedTax, currency)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{l('On taxable', 'Sobre gravable', 'Auf steuerpflichtig')} {formatCurrency(taxableIncome, currency)}</p>
          </CardContent></Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">{l('Overview', 'Resumen', 'Übersicht')}</TabsTrigger>
            <TabsTrigger value="entries">{l('Entries', 'Entradas', 'Einträge')}</TabsTrigger>
            <TabsTrigger value="tax">{l('Tax Summary', 'Resumen Fiscal', 'Steuerzusammenfassung')}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-3">
            <Card><CardHeader className="pb-2"><CardTitle className="text-base">{l('By Category', 'Por Categoría', 'Nach Kategorie')}</CardTitle></CardHeader>
              <CardContent>
                {byCategory.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-6">{l('No entries yet', 'Sin entradas aún', 'Noch keine Einträge')}</p>
                  : <div className="space-y-2">{byCategory.map(([cat, totals]) => (
                    <div key={cat} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-sm font-medium">{catLabel(cat)}</span>
                      <div className="flex gap-4 text-sm">
                        {totals.income > 0 && <span className="text-green-600">+{formatCurrency(totals.income, currency)}</span>}
                        {totals.expense > 0 && <span className="text-destructive">-{formatCurrency(totals.expense, currency)}</span>}
                        {totals.deductible > 0 && <Badge variant="outline" className="text-xs ml-1">{l('Deductible', 'Deducible', 'Absetzbar')}</Badge>}
                      </div>
                    </div>
                  ))}</div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Entries Tab */}
          <TabsContent value="entries" className="space-y-3">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={l('Search entries...', 'Buscar entradas...', 'Einträge suchen...')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" /></div>
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              : filteredEntries.length === 0 ? <Card className="border-dashed"><CardContent className="py-12 text-center"><Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">{l('No entries found', 'No se encontraron entradas', 'Keine Einträge gefunden')}</p></CardContent></Card>
              : <div className="space-y-2">{filteredEntries.map(entry => (
                <Card key={entry.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${entry.entry_type === 'income' ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                      {entry.entry_type === 'income' ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{entry.description || catLabel(entry.category)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-xs">{catLabel(entry.category)}</Badge>
                        {entry.is_deductible && <Badge variant="outline" className="text-xs text-primary">{l('Deductible', 'Deducible', 'Absetzbar')}</Badge>}
                        <span className="text-xs text-muted-foreground">{format(new Date(entry.entry_date), 'MMM d')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${entry.entry_type === 'income' ? 'text-green-600' : 'text-destructive'}`}>
                        {entry.entry_type === 'income' ? '+' : '-'}{formatCurrency(Number(entry.amount), currency)}
                      </p>
                      {entry.vendor_name && <p className="text-xs text-muted-foreground truncate max-w-[120px]">{entry.vendor_name}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteEntry(entry.id)}><Trash2 className="h-4 w-4" /></Button>
                  </CardContent>
                </Card>
              ))}</div>}
          </TabsContent>

          {/* Tax Summary Tab */}
          <TabsContent value="tax" className="space-y-3">
            <Card className="border-primary/30">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" />{l(`${selectedYear} Tax Estimate`, `Estimación Fiscal ${selectedYear}`, `Steuerschätzung ${selectedYear}`)}</CardTitle>
                <CardDescription>{defaultJurisdiction === 'CR' ? l('Based on Costa Rica tax brackets (Renta)', 'Basado en las escalas de impuesto de renta de Costa Rica', 'Basierend auf costaricanischen Steuersätzen') : l('Based on US federal tax brackets', 'Basado en las escalas federales de EE.UU.', 'Basierend auf US-Bundessteuersätzen')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Row label={l('Gross Income', 'Ingreso Bruto', 'Bruttoeinkommen')} value={formatCurrency(totalIncome, currency)} />
                  <Row label={l('Total Expenses', 'Gastos Totales', 'Gesamtausgaben')} value={`-${formatCurrency(totalExpenses, currency)}`} className="text-destructive" />
                  <Row label={l('Total Deductions', 'Deducciones Totales', 'Gesamtabzüge')} value={`-${formatCurrency(totalDeductible, currency)}`} className="text-primary" />
                  <div className="border-t border-border pt-2">
                    <Row label={l('Taxable Income', 'Ingreso Gravable', 'Steuerpflichtiges Einkommen')} value={formatCurrency(taxableIncome, currency)} bold />
                  </div>
                  <div className="border-t border-border pt-2">
                    <Row label={l('Estimated Tax', 'Impuesto Estimado', 'Geschätzte Steuer')} value={formatCurrency(estimatedTax, currency)} bold className="text-warning" />
                    {taxableIncome > 0 && <p className="text-xs text-muted-foreground ml-4">{l('Effective rate', 'Tasa efectiva', 'Effektiver Satz')}: {((estimatedTax / taxableIncome) * 100).toFixed(1)}%</p>}
                  </div>
                </div>

                {/* Tax brackets reference */}
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">{l('Tax Brackets', 'Escalas Fiscales', 'Steuersätze')}</p>
                  <div className="space-y-1">
                    {(defaultJurisdiction === 'CR' ? CR_TAX_BRACKETS : US_TAX_BRACKETS).map((b, i) => (
                      <div key={i} className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(b.min, currency)} - {b.max === Infinity ? '∞' : formatCurrency(b.max, currency)}</span>
                        <span className="font-medium">{(b.rate * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {defaultJurisdiction === 'CR' && (
                  <div className="bg-muted/50 rounded-lg p-3 mt-2">
                    <p className="text-xs font-medium mb-1">{l('Costa Rica Specific Taxes', 'Impuestos Específicos de Costa Rica', 'Costa Rica Spezifische Steuern')}</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• {l('IVA: 13% on goods and services', 'IVA: 13% sobre bienes y servicios', 'MwSt: 13% auf Waren und Dienstleistungen')}</li>
                      <li>• {l('Property Tax (Bienes Inmuebles): 0.25% of registered value', 'Impuesto de Bienes Inmuebles: 0.25% del valor registrado', 'Grundsteuer: 0,25% des eingetragenen Werts')}</li>
                      <li>• {l('Luxury Home Tax (Solidario): Applies to homes valued over ₡133M', 'Impuesto Solidario: Aplica a viviendas con valor superior a ₡133M', 'Luxussteuer: Gilt für Häuser über ₡133M')}</li>
                      <li>• {l('Municipal Tax (Patente): Varies by canton', 'Impuesto Municipal (Patente): Varía por cantón', 'Gemeindesteuer: Variiert nach Kanton')}</li>
                    </ul>
                  </div>
                )}

                {defaultJurisdiction === 'US' && (
                  <div className="bg-muted/50 rounded-lg p-3 mt-2">
                    <p className="text-xs font-medium mb-1">{l('US Homeowner Deductions', 'Deducciones para Propietarios EE.UU.', 'US-Hauseigentümer-Abzüge')}</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• {l('Mortgage interest (up to $750K loan)', 'Interés hipotecario (hasta $750K)', 'Hypothekenzinsen (bis $750K)')}</li>
                      <li>• {l('State & local property taxes (SALT cap: $10K)', 'Impuestos estatales y locales (límite SALT: $10K)', 'Staats-/Gemeindesteuern (SALT-Obergrenze: $10K)')}</li>
                      <li>• {l('Home office (if qualifying)', 'Oficina en casa (si califica)', 'Home-Office (wenn qualifiziert)')}</li>
                      <li>• {l('Energy efficiency credits', 'Créditos de eficiencia energética', 'Energieeffizienz-Gutschriften')}</li>
                    </ul>
                  </div>
                )}

                <p className="text-xs text-muted-foreground italic">{l('⚠️ This is an estimate only. Consult your tax professional for accurate filing.', '⚠️ Esto es solo una estimación. Consulte a su profesional fiscal para declaración precisa.', '⚠️ Dies ist nur eine Schätzung. Wenden Sie sich an Ihren Steuerberater.')}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AddEntryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        jurisdiction={defaultJurisdiction}
        categories={categories}
        orgId={profile?.org_id || ''}
        estateId={currentEstate?.id}
        onAdded={fetchEntries}
        language={language}
        currency={currency}
      />
    </ModernAppLayout>
  );
}

function Row({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-bold' : ''} ${className || ''}`}>{value}</span>
    </div>
  );
}

function AddEntryDialog({ open, onOpenChange, jurisdiction, categories, orgId, estateId, onAdded, language, currency }: {
  open: boolean; onOpenChange: (o: boolean) => void; jurisdiction: 'US' | 'CR';
  categories: typeof US_TAX_CATEGORIES; orgId: string; estateId?: string;
  onAdded: () => void; language: string; currency: string;
}) {
  const l = (en: string, es: string, de: string) => language === 'es' ? es : language === 'de' ? de : en;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    entry_type: 'expense' as 'income' | 'expense',
    category: categories[0]?.value || 'other',
    amount: '',
    description: '',
    vendor_name: '',
    entry_date: format(new Date(), 'yyyy-MM-dd'),
    is_deductible: false,
    notes: '',
  });

  async function handleSave() {
    if (!form.amount || Number(form.amount) <= 0) { toast.error(l('Enter a valid amount', 'Ingrese un monto válido', 'Gültigen Betrag eingeben')); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('financial_entries').insert([{
        org_id: orgId,
        estate_id: estateId || null,
        entry_type: form.entry_type as any,
        tax_jurisdiction: jurisdiction as any,
        category: form.category,
        amount: Number(form.amount),
        currency,
        description: form.description || null,
        vendor_name: form.vendor_name || null,
        entry_date: form.entry_date,
        is_deductible: form.is_deductible,
        tax_year: new Date(form.entry_date).getFullYear(),
        notes: form.notes || null,
      }]);
      if (error) throw error;
      toast.success(l('Entry added', 'Entrada agregada', 'Eintrag hinzugefügt'));
      onAdded();
      onOpenChange(false);
      setForm({ entry_type: 'expense', category: categories[0]?.value || 'other', amount: '', description: '', vendor_name: '', entry_date: format(new Date(), 'yyyy-MM-dd'), is_deductible: false, notes: '' });
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{l('New Financial Entry', 'Nueva Entrada Financiera', 'Neuer Finanzeintrag')}</DialogTitle><DialogDescription>{l('Track income, expenses, and deductions for tax purposes.', 'Registra ingresos, gastos y deducciones para fines fiscales.', 'Einnahmen, Ausgaben und Abzüge für Steuerzwecke erfassen.')}</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>{l('Type', 'Tipo', 'Typ')}</Label><Select value={form.entry_type} onValueChange={v => setForm(p => ({ ...p, entry_type: v as any }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="income">{l('Income', 'Ingreso', 'Einnahme')}</SelectItem><SelectItem value="expense">{l('Expense', 'Gasto', 'Ausgabe')}</SelectItem></SelectContent></Select></div>
            <div><Label>{l('Date', 'Fecha', 'Datum')}</Label><Input type="date" value={form.entry_date} onChange={e => setForm(p => ({ ...p, entry_date: e.target.value }))} /></div>
          </div>
          <div><Label>{l('Category', 'Categoría', 'Kategorie')}</Label><Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{language === 'es' ? c.es : language === 'de' ? c.de : c.en}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{l('Amount', 'Monto', 'Betrag')} ({currency})</Label><Input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
          <div><Label>{l('Description', 'Descripción', 'Beschreibung')}</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          <div><Label>{l('Vendor/Payee', 'Proveedor', 'Empfänger')}</Label><Input value={form.vendor_name} onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))} /></div>
          <div className="flex items-center gap-3"><Switch checked={form.is_deductible} onCheckedChange={v => setForm(p => ({ ...p, is_deductible: v }))} /><Label>{l('Tax Deductible', 'Deducible de Impuestos', 'Steuerlich absetzbar')}</Label></div>
          <div><Label>{l('Notes', 'Notas', 'Notizen')}</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{l('Cancel', 'Cancelar', 'Abbrechen')}</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}{l('Save', 'Guardar', 'Speichern')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
