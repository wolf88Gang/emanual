import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Leaf, Loader2, Droplets, ShieldAlert, CalendarDays, Phone, Download, Sun } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  manual: any | null;
  manual_approved_at: string | null;
  plants?: PortalPlant[];
  activity?: { id: string; action: string; at: string }[];
  invoices?: { invoice_number: string; status: string; issue_date: string; total: number; currency: string }[];
}

const ACTION_ES: Record<string, string> = {
  water: 'Riego', skip_water: 'Revisión sin riego', clean: 'Limpieza', prune: 'Poda',
  fertilize: 'Abono', rotate: 'Rotación', inspect: 'Revisión', issue: 'Incidencia',
  pest: 'Plaga', light_issue: 'Problema de luz', move: 'Reubicación',
  replace: 'Reemplazo', replace_requested: 'Reemplazo solicitado', photo: 'Foto', note: 'Nota',
};

const RESPONSIBILITY_ES: Record<string, string> = {
  raiz_y_forma: 'A cargo nuestro',
  cliente: 'A su cargo',
  compartido: 'Compartido',
};

export default function PlantOpsPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: res, error: err } = await supabase.functions.invoke('plantops-portal', {
          body: { token },
        });
        if (cancelled) return;
        if (err) {
          setError('Este enlace no está disponible.');
        } else if ((res as any)?.error) {
          const code = (res as any).error;
          setError(
            code === 'expired' ? 'Este enlace ha vencido.'
              : code === 'revoked' ? 'Este enlace fue desactivado.'
              : 'Este enlace no está disponible.',
          );
        } else {
          setData(res as PortalData);
        }
      } catch {
        if (!cancelled) setError('Este enlace no está disponible.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center space-y-2">
            <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-semibold">Enlace no disponible</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
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
            <h2 className="text-lg font-semibold">Plantas en su propiedad</h2>
            {data.plants.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {[p.zone, p.spot].filter(Boolean).join(' · ') || 'Sin ubicación registrada'}
                      </p>
                    </div>
                    {p.care_responsibility && (
                      <Badge variant="outline">
                        {p.care_responsibility === 'client' ? 'A su cargo'
                          : p.care_responsibility === 'shared' ? 'Compartido' : 'A cargo nuestro'}
                      </Badge>
                    )}
                  </div>
                  {p.next_water_due && (
                    <p className="text-sm flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-primary" /> Próximo riego: {p.next_water_due}
                      {p.water_amount_note ? ` · ${p.water_amount_note}` : ''}
                    </p>
                  )}
                  {p.client_instructions && <p className="text-sm">{p.client_instructions}</p>}
                  {p.do_not_do && <p className="text-sm text-destructive">No hacer: {p.do_not_do}</p>}
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {data.manual && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Manual de cuidado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {Array.isArray(data.manual)
                ? data.manual.map((section: any, i: number) => (
                    <div key={i}>
                      {section?.title && <p className="font-medium">{section.title}</p>}
                      <p className="text-muted-foreground whitespace-pre-wrap">{section?.body ?? String(section)}</p>
                    </div>
                  ))
                : Object.entries(data.manual as Record<string, unknown>).map(([k, v]) => (
                    <div key={k}>
                      <p className="font-medium">{k}</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">{String(v)}</p>
                    </div>
                  ))}
              {data.manual_approved_at && (
                <p className="text-xs text-muted-foreground pt-2">
                  Versión aprobada el {new Date(data.manual_approved_at).toLocaleDateString('es-CR')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {data.activity && data.activity.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Actividad reciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.activity.map((a) => (
                <div key={a.id} className="flex justify-between gap-3 border-b border-border/50 pb-2 last:border-0">
                  <span>{ACTION_ES[a.action] || a.action}{a.notes ? ` — ${a.notes}` : ''}</span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(a.at).toLocaleDateString('es-CR')}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {data.invoices && data.invoices.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Facturación</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.invoices.map((inv) => (
                <div key={inv.invoice_number} className="flex justify-between gap-3">
                  <span>{inv.invoice_number} · {inv.issue_date}</span>
                  <span>{inv.currency} {Number(inv.total).toLocaleString('es-CR')} · {inv.status}</span>
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
