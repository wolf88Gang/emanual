import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, ArrowRight, Users, Settings } from 'lucide-react';
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
 * Client-first home screen for BUSINESS accounts.
 *
 * A business account is NOT a property: a brand-new business has no project yet
 * and must never see a "No property set up" dead end. The first action is
 * always adding a client.
 */
export default function BusinessHome() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { language, tl } = useLanguage();
  const l = (en: string, es: string, de: string) => tl({ en, es, de });
  const { labels, archetype, navModules, canUse, loading: modulesLoading } = useModules();
  const orgId = profile?.org_id ?? null;

  const { data: clients, isLoading } = useQuery({
    queryKey: ['business-home-clients', orgId],
    enabled: !!orgId && canUse('clients'),
    queryFn: () => fetchClientWorkspace(orgId!),
  });

  /** Total sites in the organization (including sites not yet linked to a client). */
  const { data: siteCount } = useQuery({
    queryKey: ['business-home-sites', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('estates')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const rows = clients ?? [];
  const projectCount = siteCount ?? rows.reduce((n, c) => n + (c.projects?.length ?? 0), 0);


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
          <p className="text-muted-foreground">
            {l(
              `Start by adding a ${labels.client.toLowerCase()}, then add their ${labels.projectPlural.toLowerCase()}.`,
              `Comience agregando un ${labels.client.toLowerCase()}, luego agregue sus ${labels.projectPlural.toLowerCase()}.`,
              `Beginnen Sie mit einem ${labels.client}, dann fügen Sie dessen ${labels.projectPlural} hinzu.`,
            )}
          </p>
        </header>

        {(isLoading || modulesLoading) && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {l('Loading…', 'Cargando…', 'Lädt…')}
          </div>
        )}

        {!isLoading && !modulesLoading && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{labels.client}s</CardDescription>
                  <CardTitle className="text-3xl">{rows.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{labels.projectPlural}</CardDescription>
                  <CardTitle className="text-3xl">{projectCount}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {canUse('clients') && rows.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-10 flex flex-col items-center text-center gap-4">
                  <Users className="h-10 w-10 text-muted-foreground/50" />
                  <div>
                    <p className="font-semibold">
                      {l(
                        `No ${labels.client.toLowerCase()}s yet`,
                        `Aún no hay ${labels.client.toLowerCase()}s`,
                        `Noch keine ${labels.client}n`,
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {l(
                        'Your workspace is ready. Add your first client to begin.',
                        'Su espacio de trabajo está listo. Agregue su primer cliente para comenzar.',
                        'Ihr Arbeitsbereich ist bereit. Fügen Sie den ersten Kunden hinzu.',
                      )}
                    </p>
                  </div>
                  <Button onClick={() => navigate('/plantops/nuevo-cliente')}>
                    <Plus className="h-4 w-4 mr-2" />
                    {l(`Add ${labels.client.toLowerCase()}`, `Agregar ${labels.client.toLowerCase()}`, `${labels.client} hinzufügen`)}
                  </Button>
                </CardContent>
              </Card>
            )}

            {rows.length > 0 && (
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
                      <Badge variant="outline">
                        {(c.projects?.length ?? 0)} {labels.projectPlural.toLowerCase()}
                      </Badge>
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
