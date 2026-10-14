import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Droplets, Ban, HelpCircle, MapPin, FileText, Receipt, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Seo } from '@/components/Seo';
import { buildManualDocument, manualToPlainText } from '@/lib/manualRender';

interface PortalPlant {
  id: string;
  estate_id: string;
  name: string | null;
  zone: string | null;
  spot: string | null;
  next_water_due: string | null;
  water_amount_note: string | null;
  client_instructions: string | null;
  do_not_do: string | null;
  care_responsibility: string | null;
  water_state: 'no_regar' | 'regar' | 'revisar';
  water_message: string | null;
}

interface PortalPayload {
  client: string | null;
  company: string | null;
  contact_note: string | null;
  projects?: { id: string; name: string | null; address: string | null }[];
  plants?: PortalPlant[];
  activity?: { id: string; estate_id: string; action: string; at: string }[];
  manuals?: { estate_id: string; approved_at: string; snapshot: unknown }[];
  invoices?: { invoice_number: string; status: string; issue_date: string; due_date: string | null; total: number; currency: string; estate_id: string | null }[];
  documents?: { id: string; title: string; category: string | null; estate_id: string }[];
  error?: string;
}

/**
 * Aggregated, login-free client portal: one link, every project of that client.
 * Read-only. Manuals come from approved snapshots. No internal notes.
 */
type Lang = 'en' | 'es' | 'de';
/** No language in the payload: browser preference, Spanish fallback (primary market). */
function browserLang(): Lang {
  for (const c of navigator.languages ?? [navigator.language]) {
    const v = (c ?? '').slice(0, 2).toLowerCase();
    if (v === 'es' || v === 'de' || v === 'en') return v as Lang;
  }
  return 'es';
}
const COPY = {
  unavailableTitle: ['Link unavailable', 'Enlace no disponible', 'Link nicht verfügbar'],
  expired: ['This link has expired. Please ask your service provider for a new one.', 'Este enlace venció. Solicite uno nuevo a su proveedor de servicio.', 'Dieser Link ist abgelaufen. Bitten Sie Ihren Dienstleister um einen neuen.'],
  revoked: ['This link was deactivated. Please ask your service provider for a new one.', 'Este enlace fue desactivado. Solicite uno nuevo a su proveedor de servicio.', 'Dieser Link wurde deaktiviert. Bitten Sie Ihren Dienstleister um einen neuen.'],
  unavailable: ['We could not find information for this link. Please check it or ask your service provider.', 'No encontramos información para este enlace. Revíselo o consulte a su proveedor de servicio.', 'Zu diesem Link wurden keine Informationen gefunden. Bitte prüfen Sie ihn oder fragen Sie Ihren Dienstleister.'],
  intro: ['What was done at your properties and what needs attention.', 'Lo que se hizo en sus propiedades y lo que necesita atención.', 'Was in Ihren Objekten erledigt wurde und was Aufmerksamkeit braucht.'],
  properties: ['Properties', 'Propiedades', 'Objekte'],
  plants: ['Plants', 'Plantas', 'Pflanzen'],
  activity: ['Recent activity', 'Actividad reciente', 'Letzte Aktivität'],
  manuals: ['Care guides', 'Guías de cuidado', 'Pflegeanleitungen'],
  invoices: ['Invoices', 'Facturas', 'Rechnungen'],
  documents: ['Documents', 'Documentos', 'Dokumente'],
  pendingReview: ['Pending review by your service team', 'Pendiente de revisión por su equipo de servicio', 'Wird von Ihrem Serviceteam geprüft'],
  amount: ['Amount: ', 'Cantidad: ', 'Menge: '],
  doNot: ['Do not: ', 'No hacer: ', 'Nicht tun: '],
  manual: ['Care guide', 'Guía de cuidado', 'Pflegeanleitung'],
  approvedOn: ['Approved on', 'Aprobado el', 'Genehmigt am'],
  pageTitle: ['Your properties | HomeGuide', 'Sus propiedades | HomeGuide', 'Ihre Objekte | HomeGuide'],
  pageDesc: ['Private page shared by your service provider.', 'Página privada compartida por su proveedor de servicio.', 'Private Seite Ihres Dienstleisters.'],
} as const;
const LOCALES: Record<Lang, string> = { en: 'en-US', es: 'es-CR', de: 'de-DE' };

export default function ClientPortal() {
  const lang = useMemo(browserLang, []);
  const t = (k: keyof typeof COPY) => COPY[k][lang === 'es' ? 1 : lang === 'de' ? 2 : 0];
  const locale = LOCALES[lang];
  const seo = <Seo noindex title={t('pageTitle')} description={t('pageDesc')} path="/cliente" />;
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!token) return;
      setLoading(true);
      try {
        const { data: res, error: err } = await supabase.functions.invoke('plantops-client-portal', {
          body: { token },
        });
        if (err) throw err;
        if ((res as PortalPayload)?.error) {
          setError((res as PortalPayload).error!);
        } else {
          setData(res as PortalPayload);
        }
      } catch {
        setError('unavailable');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const projectName = useMemo(() => {
    const map = new Map<string, string>();
    (data?.projects || []).forEach((p) => map.set(p.id, p.name ?? '—'));
    return (id: string | null) => (id ? map.get(id) ?? '' : '');
  }, [data]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        {seo}
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        {seo}
        <Card className="max-w-sm w-full">
          <CardHeader><CardTitle>{t('unavailableTitle')}</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t(error === 'expired' ? 'expired' : error === 'revoked' ? 'revoked' : 'unavailable')}
          </CardContent>
        </Card>
      </main>
    );
  }

  const waterIcon = (state: PortalPlant['water_state']) =>
    state === 'regar' ? <Droplets className="h-4 w-4 text-primary" />
      : state === 'no_regar' ? <Ban className="h-4 w-4 text-destructive" />
      : <HelpCircle className="h-4 w-4 text-muted-foreground" />;

  const hasPlants = (data.plants || []).length > 0;
  const hasManuals = (data.manuals || []).length > 0;
  const hasInvoices = (data.invoices || []).length > 0;
  const hasActivity = (data.activity || []).length > 0;
  const hasDocs = (data.documents || []).length > 0;

  return (
    <main className="min-h-screen bg-background">
      {seo}
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{data.company ?? ''}</p>
          <h1 className="text-2xl font-bold">{data.client ?? ''}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('intro')}</p>
          {data.contact_note && <p className="text-sm text-muted-foreground mt-1">{data.contact_note}</p>}
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {(data.projects || []).length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t('properties')}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.projects!.map((p) => (
                <div key={p.id} className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{p.name}</p>
                    {p.address && <p className="text-muted-foreground text-xs">{p.address}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue={hasPlants ? 'plantas' : hasManuals ? 'manuales' : hasInvoices ? 'facturas' : 'actividad'}>
          <TabsList className="flex-wrap h-auto">
            {hasPlants && <TabsTrigger value="plantas">{t('plants')}</TabsTrigger>}
            {hasActivity && <TabsTrigger value="actividad">{t('activity')}</TabsTrigger>}
            {hasManuals && <TabsTrigger value="manuales">{t('manuals')}</TabsTrigger>}
            {hasInvoices && <TabsTrigger value="facturas">{t('invoices')}</TabsTrigger>}
            {hasDocs && <TabsTrigger value="documentos">{t('documents')}</TabsTrigger>}
          </TabsList>

          {hasPlants && (
            <TabsContent value="plantas" className="space-y-3 pt-3">
              {data.plants!.map((p) => (
                <Card key={p.id}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{p.name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">
                          {[projectName(p.estate_id), p.zone, p.spot].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      {p.care_responsibility && (
                        <Badge variant="outline" className="capitalize">
                          {p.care_responsibility.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {waterIcon(p.water_state)}
                      <span>{p.water_message ?? t('pendingReview')}</span>
                    </div>
                    {p.water_amount_note && (
                      <p className="text-sm"><span className="text-muted-foreground">{t('amount')}</span>{p.water_amount_note}</p>
                    )}
                    {p.client_instructions && <p className="text-sm">{p.client_instructions}</p>}
                    {p.do_not_do && (
                      <p className="text-sm text-destructive"><span className="font-medium">{t('doNot')}</span>{p.do_not_do}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          )}

          {hasActivity && (
            <TabsContent value="actividad" className="pt-3">
              <Card>
                <CardContent className="pt-4 space-y-2">
                  {data.activity!.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                      <span className="capitalize">{a.action.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground text-xs">
                        {projectName(a.estate_id)} · {new Date(a.at).toLocaleDateString(locale)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {hasManuals && (
            <TabsContent value="manuales" className="space-y-3 pt-3">
              {data.manuals!.map((m) => (
                <Card key={m.estate_id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />{projectName(m.estate_id) || t('manual')}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {t('approvedOn')} {new Date(m.approved_at).toLocaleDateString(locale)}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                      {manualToPlainText(buildManualDocument(m.snapshot, { approvedAt: m.approved_at })).join('\n')}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          )}

          {hasInvoices && (
            <TabsContent value="facturas" className="pt-3">
              <Card>
                <CardContent className="pt-4 space-y-2">
                  {data.invoices!.map((i) => (
                    <div key={i.invoice_number} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        <span>{i.invoice_number}</span>
                      </div>
                      <div className="text-right">
                        <p>{i.currency} {Number(i.total).toLocaleString(locale)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{i.status}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {hasDocs && (
            <TabsContent value="documentos" className="pt-3">
              <Card>
                <CardContent className="pt-4 space-y-2">
                  {data.documents!.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 text-sm border-b last:border-0 pb-2 last:pb-0">
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      <span>{d.title}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{projectName(d.estate_id)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </main>
  );
}
