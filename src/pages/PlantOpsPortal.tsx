import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Leaf, Loader2, Droplets, ShieldAlert, CalendarDays, Phone, Download, Sun } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buildManualDocument } from '@/lib/manualRender';

type Lang = 'en' | 'es' | 'de';

interface PortalPlant {
  id: string;
  name: string | null;
  zone: string | null;
  spot: string | null;
  next_water_due: string | null;
  last_watered_at: string | null;
  water_amount_note: string | null;
  client_instructions: string | null;
  do_not_do: string | null;
  care_responsibility: string | null;
  light_required: string | null;
  light_actual: string | null;
  water_state: 'regar' | 'no_regar' | 'revisar';
  water_message: string | null;
}

interface PortalData {
  estate: { name: string | null; address: string | null };
  client: string | null;
  company: string | null;
  contact_note: string | null;
  /** Preferred language of the client contact, resolved server-side. */
  language?: string | null;
  manual: any | null;
  manual_approved_at: string | null;
  plants?: PortalPlant[];
  activity?: { id: string; action: string; at: string }[];
  invoices?: { invoice_number: string; status: string; issue_date: string; total: number; currency: string }[];
}

/** Language priority: contact preference → organization default → browser → EN. */
function resolveLang(serverLang?: string | null): Lang {
  const candidates = [serverLang, ...(navigator.languages ?? [navigator.language])];
  for (const c of candidates) {
    const v = (c ?? '').slice(0, 2).toLowerCase();
    if (v === 'es' || v === 'de' || v === 'en') return v as Lang;
  }
  return 'en';
}

const ACTIONS: Record<string, [string, string, string]> = {
  water: ['Watering', 'Riego', 'Bewässerung'],
  skip_water: ['Checked, not watered', 'Revisión sin riego', 'Geprüft, nicht gegossen'],
  clean: ['Cleaning', 'Limpieza', 'Reinigung'],
  prune: ['Pruning', 'Poda', 'Rückschnitt'],
  fertilize: ['Fertilizing', 'Abono', 'Düngung'],
  rotate: ['Rotation', 'Rotación', 'Rotation'],
  inspect: ['Inspection', 'Revisión', 'Kontrolle'],
  issue: ['Issue', 'Incidencia', 'Vorfall'],
  pest: ['Pest', 'Plaga', 'Schädling'],
  light_issue: ['Light issue', 'Problema de luz', 'Lichtproblem'],
  move: ['Relocation', 'Reubicación', 'Umstellung'],
  replace: ['Replacement', 'Reemplazo', 'Ersatz'],
  replace_requested: ['Replacement requested', 'Reemplazo solicitado', 'Ersatz angefordert'],
  photo: ['Photo', 'Foto', 'Foto'],
  note: ['Note', 'Nota', 'Notiz'],
};

const RESPONSIBILITY: Record<string, [string, string, string]> = {
  raiz_y_forma: ['Handled by us', 'A cargo nuestro', 'Von uns betreut'],
  cliente: ['Handled by you', 'A su cargo', 'Von Ihnen betreut'],
  compartido: ['Shared', 'Compartido', 'Gemeinsam'],
};

const COPY = {
  unavailableTitle: ['Link unavailable', 'Enlace no disponible', 'Link nicht verfügbar'],
  unavailable: ['This link is not available.', 'Este enlace no está disponible.', 'Dieser Link ist nicht verfügbar.'],
  expired: ['This link has expired.', 'Este enlace ha vencido.', 'Dieser Link ist abgelaufen.'],
  revoked: ['This link was deactivated.', 'Este enlace fue desactivado.', 'Dieser Link wurde deaktiviert.'],
  plants: ['Plants at your property', 'Plantas en su propiedad', 'Pflanzen in Ihrem Objekt'],
  noLocation: ['No location recorded', 'Sin ubicación registrada', 'Kein Standort erfasst'],
  pendingReview: ['Pending review by our team', 'Pendiente de revisión por nuestro equipo', 'Wird von unserem Team geprüft'],
  amount: ['Amount', 'Cantidad', 'Menge'],
  light: ['Light', 'Luz', 'Licht'],
  actual: ['actual', 'actual', 'aktuell'],
  doNot: ['Do not', 'No hacer', 'Nicht tun'],
  manual: ['Care manual', 'Manual de cuidado', 'Pflegehandbuch'],
  approvedOn: ['Version approved on', 'Versión aprobada el', 'Version genehmigt am'],
  activity: ['Recent activity', 'Actividad reciente', 'Letzte Aktivität'],
  billing: ['Billing', 'Facturación', 'Abrechnung'],
} as const;

const LOCALES: Record<Lang, string> = { en: 'en-US', es: 'es-CR', de: 'de-DE' };

export default function PlantOpsPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [errorCode, setErrorCode] = useState<'expired' | 'revoked' | 'unavailable' | null>(null);
  const [loading, setLoading] = useState(true);

  const lang = useMemo<Lang>(() => resolveLang(data?.language ?? null), [data?.language]);
  const idx = lang === 'es' ? 1 : lang === 'de' ? 2 : 0;
  const t = (key: keyof typeof COPY) => COPY[key][idx];
  const locale = LOCALES[lang];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: res, error: err } = await supabase.functions.invoke('plantops-portal', {
          body: { token },
        });
        if (cancelled) return;
        if (err) {
          setErrorCode('unavailable');
        } else if ((res as any)?.error) {
          const code = (res as any).error;
          setErrorCode(code === 'expired' ? 'expired' : code === 'revoked' ? 'revoked' : 'unavailable');
        } else {
          setData(res as PortalData);
        }
      } catch {
        if (!cancelled) setErrorCode('unavailable');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  /** Exports the approved manual snapshot exactly as received — no live data. */
  const downloadManual = async () => {
    if (!data?.manual) return;
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    let y = margin;
    const line = (text: string, size = 11, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      for (const chunk of doc.splitTextToSize(text, width)) {
        if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
        doc.text(chunk, margin, y);
        y += size + 4;
      }
    };
    const rendered = buildManualDocument(data.manual, { approvedAt: data.manual_approved_at ?? null });
    line(rendered.brand, 12, true);
    line(rendered.title, 18, true);
    if (data.company) line(data.company, 11);
    if (rendered.approvedLabel) line(rendered.approvedLabel, 9);
    y += 10;
    for (const section of rendered.sections) {
      line(section.title, 13, true);
      for (const item of section.lines) {
        line(item.label ? `${item.label}: ${item.value}` : `• ${item.value}`, 11);
      }
      y += 8;
    }
    doc.save(`manual-${(data.estate?.name || 'property').toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (errorCode || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center space-y-2">
            <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-semibold">{t('unavailableTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t(errorCode ?? 'unavailable')}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto p-5 space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Leaf className="h-5 w-5" />
            <span className="text-sm font-medium">{data.company}</span>
          </div>
          <h1 className="text-2xl font-semibold">{data.estate?.name}</h1>
          {data.client && <p className="text-sm text-muted-foreground">{data.client}</p>}
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-5 space-y-5">
        {data.plants && data.plants.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{t('plants')}</h2>
            {data.plants.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {[p.zone, p.spot].filter(Boolean).join(' · ') || t('noLocation')}
                      </p>
                    </div>
                    {p.care_responsibility && (
                      <Badge variant="outline">
                        {(RESPONSIBILITY[p.care_responsibility] ?? RESPONSIBILITY.raiz_y_forma)[idx]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm flex items-center gap-2 font-medium">
                    <Droplets className={p.water_state === 'regar' ? 'h-4 w-4 text-primary' : 'h-4 w-4 text-muted-foreground'} />
                    {p.water_message ?? t('pendingReview')}
                  </p>
                  {p.water_amount_note && (
                    <p className="text-sm text-muted-foreground">{t('amount')}: {p.water_amount_note}</p>
                  )}
                  {(p.light_required || p.light_actual) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      {t('light')}: {p.light_required ?? '—'}
                      {p.light_actual ? ` · ${t('actual')}: ${p.light_actual}` : ''}
                    </p>
                  )}
                  {p.client_instructions && <p className="text-sm">{p.client_instructions}</p>}
                  {p.do_not_do && <p className="text-sm text-destructive">{t('doNot')}: {p.do_not_do}</p>}
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {data.manual && (
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">{t('manual')}</CardTitle>
              <Button variant="outline" size="sm" onClick={downloadManual}>
                <Download className="h-4 w-4 mr-1" /> PDF
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {buildManualDocument(data.manual, { approvedAt: data.manual_approved_at ?? null }).sections.map((section, i) => (
                <div key={i} className="space-y-1">
                  <p className="font-medium">{section.title}</p>
                  {section.lines.map((item, j) => (
                    <p key={j} className="text-muted-foreground whitespace-pre-wrap">
                      {item.label ? `${item.label}: ${item.value}` : item.value}
                    </p>
                  ))}
                </div>
              ))}
              {data.manual_approved_at && (
                <p className="text-xs text-muted-foreground pt-2">
                  {t('approvedOn')} {new Date(data.manual_approved_at).toLocaleDateString(locale)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {data.activity && data.activity.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> {t('activity')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.activity.map((a) => (
                <div key={a.id} className="flex justify-between gap-3 border-b border-border/50 pb-2 last:border-0">
                  <span>{ACTIONS[a.action]?.[idx] || a.action}</span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(a.at).toLocaleDateString(locale)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {data.invoices && data.invoices.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t('billing')}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.invoices.map((inv) => (
                <div key={inv.invoice_number} className="flex justify-between gap-3">
                  <span>{inv.invoice_number} · {inv.issue_date}</span>
                  <span>{inv.currency} {Number(inv.total).toLocaleString(locale)} · {inv.status}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {data.contact_note && (
          <Card>
            <CardContent className="p-4 text-sm flex items-start gap-2">
              <Phone className="h-4 w-4 mt-0.5 text-primary" />
              <span className="whitespace-pre-wrap">{data.contact_note}</span>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
