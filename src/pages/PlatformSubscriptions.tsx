import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, Pencil, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlanEditorDialog } from '@/components/platform/PlanEditorDialog';
import { PlatformEmpty, PlatformError, PlatformLoading } from '@/components/platform/PlatformPageState';
import { fetchPlatformOrganizations, formatMoney, type PlatformOrganization } from '@/lib/platformAdmin';

export default function PlatformSubscriptions() {
  const { language } = useLanguage();
  const l = (en: string, es: string, de: string) => language === 'es' ? es : language === 'de' ? de : en;
  const [rows, setRows] = useState<PlatformOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PlatformOrganization | null>(null);

  async function load() {
    setLoading(true); setError('');
    try { setRows(await fetchPlatformOrganizations()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : l('Plans could not be loaded.', 'No se pudieron cargar los planes.', 'Pläne konnten nicht geladen werden.')); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => rows.filter((row) => row.name.toLowerCase().includes(search.toLowerCase())), [rows, search]);

  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
    <header><h1 className="font-display text-2xl font-bold">{l('Subscriptions', 'Suscripciones', 'Abonnements')}</h1><p className="mt-1 text-sm text-muted-foreground">{l('One billing plan per client organization.', 'Un plan de cobro por organización cliente.', 'Ein Abrechnungsplan pro Kundenorganisation.')}</p></header>
    <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={l('Search organizations...', 'Buscar organizaciones...', 'Organisationen suchen...')} /></div>
    {loading ? <PlatformLoading /> : error ? <PlatformError message={error} retry={() => void load()} /> : filtered.length === 0 ? <PlatformEmpty message={l('No matching organizations.', 'No hay organizaciones coincidentes.', 'Keine passenden Organisationen.')} /> : <div className="overflow-hidden rounded-md border"><div className="hidden grid-cols-[minmax(180px,1fr)_120px_130px_130px_48px] gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground md:grid"><span>{l('Organization', 'Organización', 'Organisation')}</span><span>{l('Status', 'Estado', 'Status')}</span><span>{l('Cycle', 'Ciclo', 'Zyklus')}</span><span>{l('Amount', 'Monto', 'Betrag')}</span><span /></div>{filtered.map((row) => <div key={row.id} className="grid gap-3 border-b px-4 py-4 last:border-b-0 md:grid-cols-[minmax(180px,1fr)_120px_130px_130px_48px] md:items-center"><div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.members[0]?.email ?? l('No billing contact', 'Sin contacto de cobro', 'Kein Abrechnungskontakt')}</p></div><Badge className="w-fit" variant={row.subscription?.status === 'active' ? 'default' : 'secondary'}>{row.subscription?.status ?? l('No plan', 'Sin plan', 'Kein Plan')}</Badge><span className="text-sm capitalize">{row.subscription?.plan_type ?? '—'}</span><span className="text-sm font-semibold">{row.subscription ? formatMoney(row.subscription.amount, row.subscription.currency) : '—'}</span><Button size="icon" variant="outline" onClick={() => setEditing(row)} aria-label={l('Edit plan', 'Editar plan', 'Plan bearbeiten')}><Pencil className="h-4 w-4" /></Button></div>)}</div>}
    <PlanEditorDialog organization={editing} onOpenChange={(open) => !open && setEditing(null)} onSaved={load} />
  </div>;
}