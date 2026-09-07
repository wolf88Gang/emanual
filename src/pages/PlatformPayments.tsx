import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PlatformEmpty, PlatformError, PlatformLoading } from '@/components/platform/PlatformPageState';
import { fetchPlatformOrganizations, formatMoney, type PlatformOrganization } from '@/lib/platformAdmin';

export default function PlatformPayments() {
  const { language } = useLanguage();
  const l = (en: string, es: string, de: string) => (language === 'es' ? es : language === 'de' ? de : en);
  const [rows, setRows] = useState<PlatformOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setRows(await fetchPlatformOrganizations());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : l('Payments could not be loaded.', 'No se pudieron cargar los pagos.', 'Zahlungen konnten nicht geladen werden.'),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const records = useMemo(
    () =>
      rows
        .filter((row) => row.subscription && row.name.toLowerCase().includes(search.toLowerCase()))
        .map((row) => ({ org: row.name, sub: row.subscription! }))
        .sort((a, b) => new Date(b.sub.created_at).getTime() - new Date(a.sub.created_at).getTime()),
    [rows, search],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="font-display text-2xl font-bold">{l('Payments', 'Pagos', 'Zahlungen')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {l(
            'Recorded billing plans and their payment references.',
            'Planes de cobro registrados y sus referencias de pago.',
            'Erfasste Abrechnungspläne und ihre Zahlungsreferenzen.',
          )}
        </p>
      </header>

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
      ) : records.length === 0 ? (
        <PlatformEmpty
          message={l('No payment records yet.', 'Aún no hay registros de pago.', 'Noch keine Zahlungsdatensätze.')}
        />
      ) : (
        <div className="overflow-hidden rounded-md border">
          {records.map(({ org, sub }) => (
            <div
              key={sub.id}
              className="grid gap-2 border-b px-4 py-4 last:border-b-0 md:grid-cols-[minmax(180px,1fr)_120px_130px_1fr] md:items-center"
            >
              <p className="font-medium">{org}</p>
              <Badge className="w-fit" variant={sub.status === 'active' ? 'default' : 'secondary'}>
                {sub.status}
              </Badge>
              <span className="text-sm font-semibold">{formatMoney(sub.amount, sub.currency)}</span>
              <span className="truncate text-xs text-muted-foreground">
                {format(new Date(sub.created_at), 'MMM d, yyyy')} ·{' '}
                {sub.paypal_capture_id ?? sub.paypal_order_id ?? l('Manual record', 'Registro manual', 'Manueller Eintrag')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
