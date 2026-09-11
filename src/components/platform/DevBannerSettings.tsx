import React from 'react';
import { HardHat, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDevBannerAdmin } from '@/hooks/useDevBanner';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

type OrgMode = 'inherit' | 'on' | 'off';

export function DevBannerSettings() {
  const { language } = useLanguage();
  const l = (en: string, es: string, de: string) => (language === 'es' ? es : language === 'de' ? de : en);
  const { globalEnabled, orgs, loading, error, reload, setGlobal, setOrgOverride } = useDevBannerAdmin();

  const modeOf = (override: boolean | null): OrgMode =>
    override === null || override === undefined ? 'inherit' : override ? 'on' : 'off';

  const label = (mode: OrgMode) =>
    mode === 'inherit'
      ? l('Default', 'Por defecto', 'Standard')
      : mode === 'on'
        ? l('Always on', 'Siempre visible', 'Immer sichtbar')
        : l('Hidden', 'Oculto', 'Ausgeblendet');

  const save = async (fn: () => Promise<void>) => {
    try {
      await fn();
      toast({ title: l('Saved', 'Guardado', 'Gespeichert') });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: l('Could not save', 'No se pudo guardar', 'Konnte nicht gespeichert werden'),
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const cycle = (mode: OrgMode): boolean | null => (mode === 'inherit' ? true : mode === 'on' ? false : null);

  return (
    <section className="space-y-4 rounded-md border bg-card p-4">
      <header className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <HardHat className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="font-display text-lg font-semibold">
              {l('Development notice', 'Aviso de desarrollo', 'Entwicklungshinweis')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {l(
                'Show or hide the "under active development" message, for everyone or for specific clients.',
                'Muestra u oculta el mensaje de "en desarrollo activo", para todos o para clientes específicos.',
                'Zeigt oder verbirgt den Hinweis "in aktiver Entwicklung", global oder für bestimmte Kunden.',
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {l('Refresh', 'Actualizar', 'Aktualisieren')}
        </Button>
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="font-medium">{l('Show to everyone', 'Mostrar a todos', 'Für alle anzeigen')}</p>
          <p className="text-sm text-muted-foreground">
            {l('Default for all client accounts.', 'Valor por defecto para todas las cuentas.', 'Standard für alle Kundenkonten.')}
          </p>
        </div>
        <Switch
          checked={globalEnabled}
          disabled={loading}
          onCheckedChange={(value) => void save(() => setGlobal(value))}
          aria-label={l('Show to everyone', 'Mostrar a todos', 'Für alle anzeigen')}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          {l('Per client', 'Por cliente', 'Pro Kunde')}
        </p>
        {loading && orgs.length === 0 ? (
          [0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />)
        ) : orgs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{l('No client accounts yet.', 'Aún no hay cuentas de cliente.', 'Noch keine Kundenkonten.')}</p>
        ) : (
          orgs.map((org) => {
            const mode = modeOf(org.dev_banner_override);
            const effective = mode === 'inherit' ? globalEnabled : mode === 'on';
            return (
              <div key={org.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{org.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {effective
                      ? l('Notice visible', 'Aviso visible', 'Hinweis sichtbar')
                      : l('Notice hidden', 'Aviso oculto', 'Hinweis verborgen')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={mode === 'inherit' ? 'secondary' : 'outline'}>{label(mode)}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void save(() => setOrgOverride(org.id, cycle(mode)))}
                  >
                    {l('Change', 'Cambiar', 'Ändern')}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
