import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowRight, Building2, Mail, Pencil, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlanEditorDialog } from '@/components/platform/PlanEditorDialog';
import { PlatformEmpty, PlatformError, PlatformLoading } from '@/components/platform/PlatformPageState';
import { fetchPlatformOrganizations, formatMoney, type PlatformOrganization } from '@/lib/platformAdmin';

export default function PlatformClients() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const l = (en: string, es: string, de: string) => (language === 'es' ? es : language === 'de' ? de : en);

  const [rows, setRows] = useState<PlatformOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PlatformOrganization | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setRows(await fetchPlatformOrganizations());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : l('Clients could not be loaded.', 'No se pudieron cargar los clientes.', 'Kunden konnten nicht geladen werden.'),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const term = search.toLowerCase();
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.name.toLowerCase().includes(term) ||
          (row.org_type ?? '').toLowerCase().includes(term) ||
          row.members.some((member) => member.email.toLowerCase().includes(term)),
      ),
    [rows, term],
  );

  const summary = useMemo(() => {
    const now = new Date();
    const active = rows.filter((row) => row.subscription?.status === 'active');
    return {
      total: rows.length,
      active: active.length,
      revenue: active.reduce((sum, row) => sum + (Number(row.subscription?.amount) || 0), 0),
      newThisMonth: rows.filter((row) => {
        const created = new Date(row.created_at);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length,
    };
  }, [rows]);

  const tiles = [
    { label: l('Client organizations', 'Organizaciones cliente', 'Kundenorganisationen'), value: String(summary.total) },
    { label: l('Active plans', 'Planes activos', 'Aktive Pläne'), value: String(summary.active) },
    { label: l('Active plan value', 'Valor de planes activos', 'Wert aktiver Pläne'), value: formatMoney(summary.revenue, 'USD') },
    { label: l('New this month', 'Nuevos este mes', 'Neu diesen Monat'), value: String(summary.newThisMonth) },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="font-display text-2xl font-bold">{l('Clients', 'Clientes', 'Kunden')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {l(
            'Every client organization on the platform.',
            'Todas las organizaciones cliente de la plataforma.',
            'Alle Kundenorganisationen der Plattform.',
          )}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{tile.label}</p>
              <p className="mt-1 font-display text-xl font-bold">{tile.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={l('Search organizations...', 'Buscar organizaciones...', 'Organisationen suchen...')}
        />
      </div>

      {loading ? (
        <PlatformLoading />
      ) : error ? (
        <PlatformError message={error} retry={() => void load()} />
      ) : filtered.length === 0 ? (
        <PlatformEmpty
          message={l('No matching organizations.', 'No hay organizaciones coincidentes.', 'Keine passenden Organisationen.')}
        />
      ) : (
        <div className="overflow-hidden rounded-md border">
          {filtered.map((row) => {
            const contact = row.members[0];
            return (
              <div
                key={row.id}
                className="grid gap-3 border-b px-4 py-4 last:border-b-0 md:grid-cols-[minmax(200px,1fr)_150px_140px_auto] md:items-center"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {row.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {contact?.email ?? l('No members yet', 'Sin miembros', 'Noch keine Mitglieder')} ·{' '}
                    {format(new Date(row.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {row.members.length} {l('members', 'miembros', 'Mitglieder')} · {row.estates.length}{' '}
                  {l('sites', 'sitios', 'Standorte')}
                </div>
                <Badge className="w-fit" variant={row.subscription?.status === 'active' ? 'default' : 'secondary'}>
                  {row.subscription
                    ? `${row.subscription.status} · ${formatMoney(row.subscription.amount, row.subscription.currency)}`
                    : l('No plan', 'Sin plan', 'Kein Plan')}
                </Badge>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  {contact && (
                    <Button size="icon" variant="outline" asChild aria-label={l('Email contact', 'Enviar correo', 'E-Mail senden')}>
                      <a href={`mailto:${contact.email}`}>
                        <Mail className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setEditing(row)}
                    aria-label={l('Edit plan', 'Editar plan', 'Plan bearbeiten')}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/platform/clients/${row.id}`)}>
                    {l('Open', 'Abrir', 'Öffnen')}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PlanEditorDialog organization={editing} onOpenChange={(open) => !open && setEditing(null)} onSaved={load} />
    </div>
  );
}
