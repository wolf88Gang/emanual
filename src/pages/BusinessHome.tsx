import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, ArrowRight, Users, Settings, Sparkle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useModules } from '@/hooks/useModules';
import { fetchClientWorkspace } from '@/lib/plantopsClients';
import { widgetLabel } from '@/lib/homeGuideModules';
import { archetypeLabel } from '@/lib/businessArchetypes';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

  const rows = clientsOn ? (clients ?? []) : [];
  const projectCount = projectsOn ? (siteCount ?? 0) : 0;
  const loading = modulesLoading || (clientsOn && clientsLoading) || (projectsOn && sitesLoading);

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
      <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {archetypeLabel(archetype, language)}
          </p>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold">
            {l('Your operation', 'Su operación', 'Ihr Betrieb')}
          </h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </header>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {l('Loading…', 'Cargando…', 'Lädt…')}
          </div>
        )}

        {!loading && (
          <>
            {(clientsOn || projectsOn) && (
              <div className="grid grid-cols-2 gap-3">
                {clientsOn && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{labels.client}s</CardDescription>
                      <CardTitle className="text-3xl">{rows.length}</CardTitle>
                    </CardHeader>
                  </Card>
                )}
                {projectsOn && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{labels.projectPlural}</CardDescription>
                      <CardTitle className="text-3xl">{projectCount}</CardTitle>
                    </CardHeader>
                  </Card>
                )}
              </div>
            )}

            {showEmptyState && (
              <Card className="border-dashed">
                <CardContent className="py-10 flex flex-col items-center text-center gap-4">
                  {clientsOn ? (
                    <Users className="h-10 w-10 text-muted-foreground/50" />
                  ) : (
                    <Sparkle className="h-10 w-10 text-muted-foreground/50" />
                  )}
                  <div>
                    <p className="font-semibold">
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
                        <Plus className="h-4 w-4 mr-2" />
                        {a.label}
                      </Button>
                    ))}
                    <Button variant={emptyActions.length ? 'ghost' : 'default'} onClick={() => navigate('/plantops/settings')}>
                      <Settings className="h-4 w-4 mr-2" />
                      {l('Configure functionality', 'Configurar funcionalidad', 'Funktionen konfigurieren')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {clientsOn && rows.length > 0 && (
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">{labels.client}s</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => navigate('/clients')}>
                    {l('Open workspace', 'Abrir espacio', 'Arbeitsbereich öffnen')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {rows.slice(0, 6).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/clients/${c.id}`)}
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors text-left"
                    >
                      <span className="font-medium truncate">{c.name}</span>
                      {projectsOn && (
                        <Badge variant="outline">
                          {(c.projects?.length ?? 0)} {labels.projectPlural.toLowerCase()}
                        </Badge>
                      )}
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {l('Enabled functionality', 'Funcionalidad activa', 'Aktive Funktionen')}
                </CardTitle>
                <CardDescription>
                  {l(
                    'Only what you selected is shown. Change it anytime in settings.',
                    'Solo se muestra lo que seleccionó. Cámbielo cuando quiera en configuración.',
                    'Es wird nur Ihre Auswahl angezeigt. Jederzeit in den Einstellungen änderbar.',
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {navModules.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {navModules.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => navigate(m.navRoute!)}
                        className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors text-left"
                      >
                        <m.icon className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm truncate">
                          {m.key === 'clients' ? labels.client : m.key === 'projects' ? labels.projectPlural : widgetLabel({ id: m.key, label: m.label, route: m.navRoute! }, language)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => navigate('/plantops/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  {l('Configure functionality', 'Configurar funcionalidad', 'Funktionen konfigurieren')}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ModernAppLayout>
  );
}
