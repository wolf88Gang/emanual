import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, Loader2, Copy, ExternalLink, RefreshCw, Ban, Settings2, ArrowRight, Plus } from 'lucide-react';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fetchClientWorkspace } from '@/lib/plantopsClients';
import {
  createClientPortalLink,
  rotateClientPortalLink,
  revokeClientPortalLink,
  PORTAL_TOGGLES,
  PORTAL_TOGGLE_LABELS,
  type ClientPortalLink,
} from '@/lib/plantopsComms';

/**
 * Organization-wide client portal management (module `client_portal`).
 *
 * No new portal data model: the aggregated client links live in
 * `client_portal_links` and the per-site links in `estate_share_links`,
 * exactly as the client and site screens use them.
 */
export default function ClientPortals() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { tl } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const l = (en: string, es: string, de: string) => tl({ en, es, de });
  const orgId = profile?.org_id ?? null;

  const [busy, setBusy] = useState<string | null>(null);
  /** Clear tokens are only known right after creation or regeneration. */
  const [tokens, setTokens] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['org-portals', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [clients, linksRes, siteLinksRes] = await Promise.all([
        fetchClientWorkspace(orgId!),
        supabase
          .from('client_portal_links' as any)
          .select('*')
          .eq('org_id', orgId!)
          .order('created_at', { ascending: false }),
        supabase
          .from('estate_share_links')
          .select('id, estate_id, client_id, revoked_at, expires_at, created_at, updated_at')
          .eq('org_id', orgId!),
      ]);
      if (linksRes.error) throw linksRes.error;
      return {
        clients,
        links: ((linksRes.data || []) as unknown as ClientPortalLink[]),
        siteLinks: ((siteLinksRes.data || []) as any[]),
      };
    },
  });

  const now = new Date().toISOString();
  const isActive = (lk: { revoked_at: string | null; expires_at: string | null }) =>
    !lk.revoked_at && (!lk.expires_at || lk.expires_at > now);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.clients.map((c) => {
      const clientLinks = data.links.filter((lk) => lk.client_id === c.id);
      const link = clientLinks.find((lk) => isActive(lk)) ?? clientLinks[0] ?? null;
      const siteLinks = data.siteLinks.filter((s) => s.client_id === c.id);
      return { client: c, link, siteLinks };
    });
  }, [data]);

  const activeCount = rows.filter((r) => r.link && isActive(r.link)).length;
  const portalUrl = (token: string) => `${window.location.origin}/cliente/${token}`;

  const refresh = () => qc.invalidateQueries({ queryKey: ['org-portals', orgId] });

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
      refresh();
    } catch (e: any) {
      toast({ title: l('Action failed', 'La acción falló', 'Aktion fehlgeschlagen'), description: e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const create = (clientId: string) =>
    run(`create-${clientId}`, async () => {
      const token = await createClientPortalLink(clientId, {}, null, null);
      setTokens((t) => ({ ...t, [clientId]: token }));
      toast({
        title: l('Portal created', 'Portal creado', 'Portal erstellt'),
        description: l('Copy the link now — the token is shown only once.',
          'Copie el enlace ahora: el token se muestra una sola vez.',
          'Kopieren Sie den Link jetzt — der Token wird nur einmal gezeigt.'),
      });
    });

  const regenerate = (clientId: string, linkId: string) =>
    run(`rotate-${linkId}`, async () => {
      const token = await rotateClientPortalLink(linkId);
      setTokens((t) => ({ ...t, [clientId]: token }));
      toast({ title: l('New link generated', 'Nuevo enlace generado', 'Neuer Link erzeugt') });
    });

  const revoke = (clientId: string, linkId: string) =>
    run(`revoke-${linkId}`, async () => {
      await revokeClientPortalLink(linkId);
      setTokens((t) => {
        const next = { ...t };
        delete next[clientId];
        return next;
      });
      toast({ title: l('Portal revoked', 'Portal revocado', 'Portal widerrufen') });
    });

  const copy = async (token: string) => {
    await navigator.clipboard.writeText(portalUrl(token));
    toast({ title: l('Link copied', 'Enlace copiado', 'Link kopiert') });
  };

  const sections = (lk: ClientPortalLink) =>
    PORTAL_TOGGLES.filter((k) => (lk as any)[k])
      .map((k) => tl({ ...PORTAL_TOGGLE_LABELS[k], de: PORTAL_TOGGLE_LABELS[k].en }))
      .join(' · ');

  return (
    <ModernAppLayout>
      <main className="p-4 space-y-4 max-w-5xl mx-auto safe-area-content">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            {l('Client Portals', 'Portales de clientes', 'Kundenportale')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {l('Login-free links your clients open to see their plants, care and documents.',
               'Enlaces sin cuenta que sus clientes abren para ver sus plantas, cuidados y documentos.',
               'Links ohne Konto, mit denen Kunden Pflanzen, Pflege und Dokumente sehen.')}
          </p>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{l('Active client portals', 'Portales activos', 'Aktive Kundenportale')}</CardDescription>
                <CardTitle className="text-3xl">{activeCount}</CardTitle>
              </CardHeader>
            </Card>

            {rows.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {l('No clients yet — portals belong to a client.',
                       'Aún no hay clientes: los portales pertenecen a un cliente.',
                       'Noch keine Kunden — Portale gehören zu einem Kunden.')}
                  </p>
                  <Button onClick={() => navigate('/plantops/nuevo-cliente')}>
                    <Plus className="h-4 w-4 mr-2" />{l('Add client', 'Agregar cliente', 'Kunde hinzufügen')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {rows.map(({ client, link, siteLinks }) => {
              const token = tokens[client.id];
              const active = link ? isActive(link) : false;
              const activeSites = siteLinks.filter((s) => isActive(s)).length;
              return (
                <Card key={client.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <strong className="truncate">{client.name}</strong>
                          <Badge variant={active ? 'default' : 'secondary'}>
                            {active
                              ? l('Active', 'Activo', 'Aktiv')
                              : link
                                ? l('Inactive', 'Inactivo', 'Inaktiv')
                                : l('No portal', 'Sin portal', 'Kein Portal')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {[client.email, client.phone].filter(Boolean).join(' · ') ||
                            l('No primary contact', 'Sin contacto principal', 'Kein Hauptkontakt')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(client.projects?.length ?? 0)} {l('sites', 'sitios', 'Standorte')}
                          {activeSites > 0 && ` · ${activeSites} ${l('site portals', 'portales de sitio', 'Standort-Portale')}`}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/clients/${client.id}`)}>
                        {l('Open client', 'Abrir cliente', 'Kunde öffnen')}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>

                    {link && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          {l('Created', 'Creado', 'Erstellt')}: {new Date(link.created_at).toLocaleDateString()}
                          {link.expires_at && ` · ${l('Expires', 'Expira', 'Läuft ab')}: ${new Date(link.expires_at).toLocaleDateString()}`}
                          {link.revoked_at && ` · ${l('Revoked', 'Revocado', 'Widerrufen')}`}
                        </p>
                        <p>{l('Visible', 'Visible', 'Sichtbar')}: {sections(link) || '—'}</p>
                      </div>
                    )}

                    {token && (
                      <div className="rounded-md bg-muted p-2 text-xs break-all">{portalUrl(token)}</div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {!link || !active ? (
                        <Button size="sm" disabled={busy === `create-${client.id}`} onClick={() => create(client.id)}>
                          {busy === `create-${client.id}`
                            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            : <Plus className="h-4 w-4 mr-2" />}
                          {l('Create portal', 'Crear portal', 'Portal erstellen')}
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" disabled={!token} onClick={() => token && copy(token)}>
                            <Copy className="h-4 w-4 mr-2" />{l('Copy link', 'Copiar enlace', 'Link kopieren')}
                          </Button>
                          <Button size="sm" variant="outline" disabled={!token} onClick={() => token && window.open(portalUrl(token), '_blank')}>
                            <ExternalLink className="h-4 w-4 mr-2" />{l('Open portal', 'Abrir portal', 'Portal öffnen')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/clients/${client.id}?tab=portal`)}>
                            <Settings2 className="h-4 w-4 mr-2" />{l('Configure', 'Configurar', 'Konfigurieren')}
                          </Button>
                          <Button size="sm" variant="outline" disabled={busy === `rotate-${link.id}`} onClick={() => regenerate(client.id, link.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" />{l('Regenerate', 'Regenerar', 'Neu erzeugen')}
                          </Button>
                          <Button size="sm" variant="destructive" disabled={busy === `revoke-${link.id}`} onClick={() => revoke(client.id, link.id)}>
                            <Ban className="h-4 w-4 mr-2" />{l('Revoke', 'Revocar', 'Widerrufen')}
                          </Button>
                        </>
                      )}
                    </div>

                    {!token && link && active && (
                      <p className="text-xs text-muted-foreground">
                        {l('The link is only shown when created or regenerated; only its hash is stored.',
                           'El enlace solo se muestra al crearlo o regenerarlo; solo se guarda su hash.',
                           'Der Link wird nur beim Erstellen oder Neuerzeugen gezeigt; gespeichert wird nur der Hash.')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </main>
    </ModernAppLayout>
  );
}
