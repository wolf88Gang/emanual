import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ArrowRight, Users, Settings, Sparkle, MapPin, Share2, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useModules } from '@/hooks/useModules';
import { fetchClientWorkspace } from '@/lib/plantopsClients';
import { widgetLabel } from '@/lib/homeGuideModules';
import { archetypeLabel } from '@/lib/businessArchetypes';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { StatTile, StatTileSkeleton } from '@/components/dashboard/StatTile';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Home screen for BUSINESS accounts.
 *
 * Everything on this page is generated from the enabled modules: a business
 * that disabled Clients never sees client metrics, queries or CTAs, and a
 * business with no operational module at all still lands on a useful
 * configuration prompt.
 */
export default function BusinessHome() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { language, tl } = useLanguage();
  const l = (en: string, es: string, de: string) => tl({ en, es, de });
  const { labels, archetype, navModules, canUse, loading: modulesLoading } = useModules();
  const orgId = profile?.org_id ?? null;

  const clientsOn = canUse('clients');
  const projectsOn = canUse('projects');

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['business-home-clients', orgId],
    enabled: !!orgId && clientsOn,
    queryFn: () => fetchClientWorkspace(orgId!),
  });

  /** Total sites in the organization (including sites not linked to a client). */
  const { data: siteCount, isLoading: sitesLoading } = useQuery({
    queryKey: ['business-home-sites', orgId],
    enabled: !!orgId && projectsOn,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('estates')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const portalsOn = canUse('client_portal');

  /** Active (non revoked, non expired) aggregated client portals. */
  const { data: activePortals } = useQuery({
    queryKey: ['business-home-portals', orgId],
    enabled: !!orgId && portalsOn,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_portal_links' as any)
        .select('id, revoked_at, expires_at')
        .eq('org_id', orgId!)
        .is('revoked_at', null);
      if (error) throw error;
      const now = new Date().toISOString();
      return ((data || []) as any[]).filter((lk) => !lk.expires_at || lk.expires_at > now).length;
    },
  });

  const rows = clientsOn ? (clients ?? []) : [];
  const projectCount = projectsOn ? (siteCount ?? 0) : 0;
  const loading = modulesLoading || (clientsOn && clientsLoading) || (projectsOn && sitesLoading);

  /** Micro-bars: projects per client, so the tile reflects real distribution. */
  const clientSpark = rows.slice(0, 8).map((c) => (c.projects?.length ?? 0) + 1);

  /** Empty-state actions derived from enabled modules, in priority order. */
  const emptyActions: { key: string; label: string; route: string }[] = [
    ...(clientsOn
      ? [{ key: 'clients', label: l(`Add ${labels.client.toLowerCase()}`, `Agregar ${labels.client.toLowerCase()}`, `${labels.client} hinzufügen`), route: '/plantops/nuevo-cliente' }]
      : []),
    ...(projectsOn
      ? [{ key: 'projects', label: l('Create project / site', 'Crear proyecto / sitio', 'Projekt / Standort erstellen'), route: '/estates' }]
      : []),
    ...(canUse('assets')
      ? [{ key: 'assets', label: l('Add asset', 'Agregar activo', 'Anlage hinzufügen'), route: '/assets' }]
      : []),
    ...(canUse('plants_pots')
      ? [{ key: 'plants_pots', label: l('Add plant', 'Agregar planta', 'Pflanze hinzufügen'), route: '/plantops' }]
      : []),
    ...(canUse('reminders')
      ? [{ key: 'reminders', label: l('Configure reminder', 'Configurar recordatorio', 'Erinnerung einrichten'), route: '/plantops/reminders' }]
      : []),
    ...(canUse('tasks')
      ? [{ key: 'tasks', label: l('Create task', 'Crear tarea', 'Aufgabe erstellen'), route: '/tasks' }]
      : []),
  ];

  const hasRecords = rows.length > 0 || projectCount > 0;
  const showEmptyState = !loading && !hasRecords;
  const showMetrics = clientsOn || projectsOn || portalsOn;

  const subtitle = clientsOn
    ? l(
        `Start by adding a ${labels.client.toLowerCase()}, then add their ${labels.projectPlural.toLowerCase()}.`,
        `Comience agregando un ${labels.client.toLowerCase()}, luego agregue sus ${labels.projectPlural.toLowerCase()}.`,
        `Beginnen Sie mit einem ${labels.client}, dann fügen Sie dessen ${labels.projectPlural} hinzu.`,
      )
    : projectsOn
      ? l(
          `Start by creating a ${labels.project.toLowerCase()}.`,
          `Comience creando un ${labels.project.toLowerCase()}.`,
          `Beginnen Sie mit einem ${labels.project}.`,
        )
      : navModules.length > 0
        ? l('Your enabled functionality is below.', 'Su funcionalidad activa está abajo.', 'Ihre aktiven Funktionen finden Sie unten.')
        : l(
            'No functionality is enabled yet. Choose what you need in settings.',
            'Aún no hay funcionalidad activa. Elija lo que necesita en configuración.',
            'Noch keine Funktionen aktiv. Wählen Sie in den Einstellungen.',
          );

  return (
    <ModernAppLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        {/* Header rail */}
        <header className="animate-rise-in flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-subtle" />
              {archetypeLabel(archetype, language)}
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {l('Your operation', 'Su operación', 'Ihr Betrieb')}
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {emptyActions[0] && (
              <Button size="sm" onClick={() => navigate(emptyActions[0].route)} className="hover-scale">
                <Plus className="mr-2 h-4 w-4" />
                {emptyActions[0].label}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/plantops/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              {l('Configure', 'Configurar', 'Konfigurieren')}
            </Button>
          </div>
        </header>

        {/* Quick actions: create shortcuts + one shortcut per enabled module */}
        <QuickActionRail
          actions={[
            ...emptyActions.map((a, i) => ({
              key: `new-${a.key}`,
              label: a.label,
              icon: Plus,
              primary: i === 0,
              onClick: () => navigate(a.route),
            })),
            ...navModules.map((m) => ({
              key: `mod-${m.key}`,
              label:
                m.key === 'clients'
                  ? labels.client
                  : m.key === 'projects'
                    ? labels.projectPlural
                    : widgetLabel({ id: m.key, label: m.label, route: m.navRoute! }, language),
              icon: m.icon,
              onClick: () => navigate(m.navRoute!),
            })),
            {
              key: 'settings',
              label: l('Configure', 'Configurar', 'Konfigurieren'),
              icon: Settings,
              onClick: () => navigate('/plantops/settings'),
            },
          ]}
        />


        {/* Metrics */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <StatTileSkeleton key={i} index={i} />
            ))}
          </div>
        ) : (
          showMetrics && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {clientsOn && (
                <StatTile
                  index={0}
                  label={`${labels.client}s`}
                  value={rows.length}
                  icon={Users}
                  spark={clientSpark.length ? clientSpark : undefined}
                  hint={l('In your workspace', 'En su espacio de trabajo', 'In Ihrem Arbeitsbereich')}
                  onClick={() => navigate('/clients')}
                />
              )}
              {projectsOn && (
                <StatTile
                  index={1}
                  label={labels.projectPlural}
                  value={projectCount}
                  icon={MapPin}
                  tone="info"
                  hint={l('Across all clients', 'En todos los clientes', 'Über alle Kunden')}
                  onClick={() => navigate('/sites')}
                />
              )}
              {portalsOn && (
                <StatTile
                  index={2}
                  label={l('Active client portals', 'Portales activos', 'Aktive Kundenportale')}
                  value={activePortals ?? null}
                  icon={Share2}
                  tone="accent"
                  hint={l('Shared, non-expired links', 'Enlaces compartidos vigentes', 'Geteilte, gültige Links')}
                  onClick={() => navigate('/portals')}
                />
              )}
            </div>
          )
        )}

        {showEmptyState && (
          <Card className="animate-rise-in border-dashed">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              {clientsOn ? (
                <Users className="h-10 w-10 text-muted-foreground/50" />
              ) : (
                <Sparkle className="h-10 w-10 text-muted-foreground/50" />
              )}
              <div>
                <p className="font-display font-semibold">
                  {emptyActions.length > 0
                    ? l('Set up your first records', 'Configure sus primeros registros', 'Erste Einträge anlegen')
                    : l('Nothing enabled yet', 'Nada activo todavía', 'Noch nichts aktiviert')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {emptyActions.length > 0
                    ? l(
                        'Your workspace is ready. Pick where you want to start.',
                        'Su espacio de trabajo está listo. Elija por dónde comenzar.',
                        'Ihr Arbeitsbereich ist bereit. Wählen Sie einen Startpunkt.',
                      )
                    : l(
                        'Select the functionality you need and it will appear here.',
                        'Seleccione la funcionalidad que necesita y aparecerá aquí.',
                        'Wählen Sie die benötigten Funktionen, dann erscheinen sie hier.',
                      )}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {emptyActions.map((a, i) => (
                  <Button key={a.key} variant={i === 0 ? 'default' : 'outline'} onClick={() => navigate(a.route)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {a.label}
                  </Button>
                ))}
                <Button variant={emptyActions.length ? 'ghost' : 'default'} onClick={() => navigate('/plantops/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  {l('Configure functionality', 'Configurar funcionalidad', 'Funktionen konfigurieren')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && (
          <div className="grid gap-4 lg:grid-cols-3">
            {clientsOn && rows.length > 0 && (
              <DashboardPanel
                index={1}
                className="lg:col-span-2"
                title={`${labels.client}s`}
                description={l('Most recent in your workspace', 'Más recientes en su espacio', 'Neueste in Ihrem Bereich')}
                action={
                  <Button variant="outline" size="sm" onClick={() => navigate('/clients')}>
                    {l('Open workspace', 'Abrir espacio', 'Arbeitsbereich öffnen')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                }
              >
                <ul className="divide-y divide-border/60">
                  {rows.slice(0, 6).map((c, i) => (
                    <li key={c.id} style={{ animationDelay: `${150 + i * 45}ms` }} className="animate-rise-in">
                      <button
                        onClick={() => navigate(`/clients/${c.id}`)}
                        className="group flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-2 -mx-2"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                          {c.name?.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                        {projectsOn && (
                          <Badge variant="outline" className="shrink-0">
                            {(c.projects?.length ?? 0)} {labels.projectPlural.toLowerCase()}
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </DashboardPanel>
            )}

            <DashboardPanel
              index={2}
              className={clientsOn && rows.length > 0 ? '' : 'lg:col-span-3'}
              title={l('Enabled functionality', 'Funcionalidad activa', 'Aktive Funktionen')}
              description={l(
                'Only what you selected is shown.',
                'Solo se muestra lo que seleccionó.',
                'Es wird nur Ihre Auswahl angezeigt.',
              )}
            >
              <div className="space-y-3">
                {navModules.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {navModules.map((m, i) => (
                      <button
                        key={m.key}
                        onClick={() => navigate(m.navRoute!)}
                        style={{ animationDelay: `${200 + i * 40}ms` }}
                        className="group animate-rise-in flex items-center gap-2.5 rounded-lg border border-border/70 bg-background/40 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-sm)]"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <m.icon className="h-4 w-4 text-primary" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {m.key === 'clients'
                            ? labels.client
                            : m.key === 'projects'
                              ? labels.projectPlural
                              : widgetLabel({ id: m.key, label: m.label, route: m.navRoute! }, language)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => navigate('/plantops/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  {l('Configure functionality', 'Configurar funcionalidad', 'Funktionen konfigurieren')}
                </Button>
              </div>
            </DashboardPanel>
          </div>
        )}
      </div>
    </ModernAppLayout>
  );
}
