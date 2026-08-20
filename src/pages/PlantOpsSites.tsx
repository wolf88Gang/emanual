import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, Loader2, Search } from 'lucide-react';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { fetchClientWorkspace, type ClientProjectRow } from '@/lib/plantopsClients';

interface SiteRow extends ClientProjectRow {
  clientId: string | null;
  clientName: string | null;
}

/**
 * Organization-wide site/project list: every site across every client.
 * The client list (/clients) stays the client-centric view; this screen is the
 * flat operational inventory of sites.
 */
export default function PlantOpsSites() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const l = (en: string, es: string, de?: string) =>
    language === 'es' ? es : language === 'de' ? (de ?? en) : en;

  const [rows, setRows] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    document.title = l('Sites | Home Guide', 'Sitios | Home Guide', 'Standorte | Home Guide');
  }, [language]);

  useEffect(() => {
    const orgId = profile?.org_id;
    if (!orgId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const clients = await fetchClientWorkspace(orgId);
        const flat: SiteRow[] = clients.flatMap((c) =>
          c.projects.map((p) => ({ ...p, clientId: c.id, clientName: c.name })),
        );
        if (!cancelled) setRows(flat);
      } catch (e: any) {
        toast({ title: l('Could not load sites', 'No se pudieron cargar los sitios'), description: e.message, variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.org_id]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.name, r.address_text, r.clientName].filter(Boolean).some((v) => (v as string).toLowerCase().includes(needle)),
    );
  }, [rows, q]);

  return (
    <ModernAppLayout>
      <main className="p-4 space-y-4 safe-area-content max-w-3xl mx-auto pb-24">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            {l('Sites', 'Sitios', 'Standorte')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {l('Every site you serve, across all clients.',
               'Todos los sitios que atiende, de todos los clientes.',
               'Alle betreuten Standorte, über alle Kunden.')}
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={l('Search site or client', 'Buscar sitio o cliente', 'Standort oder Kunde suchen')}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground space-y-2">
            <p>{l('No sites yet.', 'Aún no hay sitios.', 'Noch keine Standorte.')}</p>
            <p>{l('Open a client to add their first site.',
                  'Abra un cliente para agregar su primer sitio.',
                  'Öffnen Sie einen Kunden, um den ersten Standort anzulegen.')}</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => (
              <Card
                key={s.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/plantops/propiedad/${s.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium truncate">{s.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {[s.clientName, s.address_text].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <Badge variant="secondary">
                        {s.plants} {l('plants', 'plantas', 'Pflanzen')}
                      </Badge>
                      {s.waterToday > 0 && (
                        <Badge>{s.waterToday} {l('to water', 'por regar', 'zu gießen')}</Badge>
                      )}
                      {s.needsReview > 0 && (
                        <Badge variant="outline" className="border-amber-500/60 text-amber-600 dark:text-amber-400">
                          {s.needsReview} {l('to review', 'a revisar', 'zu prüfen')}
                        </Badge>
                      )}
                      {s.portalActive && (
                        <Badge variant="outline">{l('Portal active', 'Portal activo', 'Portal aktiv')}</Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </ModernAppLayout>
  );
}
