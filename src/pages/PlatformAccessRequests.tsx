import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Phone, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STATUSES = ['new', 'contacted', 'approved', 'rejected'] as const;

/** Platform-admin inbox for invitation requests submitted from the public site. */
export default function PlatformAccessRequests() {
  const { language } = useLanguage();
  const l = (en: string, es: string, de: string) => (language === 'es' ? es : language === 'de' ? de : en);
  const qc = useQueryClient();

  const { data: rows, isLoading } = useQuery({
    queryKey: ['access-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_requests' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('access_requests' as any).update({ status } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['access-requests'] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <header>
        <h1 className="font-display text-2xl font-bold">
          {l('Access requests', 'Solicitudes de acceso', 'Zugangsanfragen')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {l(
            'Operations that asked to be contacted. Accounts are created manually after review.',
            'Operaciones que solicitaron contacto. Las cuentas se crean manualmente tras la revisión.',
            'Betriebe, die kontaktiert werden möchten. Konten werden nach Prüfung manuell erstellt.',
          )}
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (rows ?? []).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {l('No requests yet.', 'Aún no hay solicitudes.', 'Noch keine Anfragen.')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(rows ?? []).map((r, i) => (
            <Card key={r.id} style={{ animationDelay: `${i * 50}ms` }} className="animate-rise-in">
              <CardContent className="space-y-3 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-semibold">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[r.company_name, r.country, r.operation_type].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <Badge variant={r.status === 'new' ? 'default' : 'outline'}>{r.status}</Badge>
                </div>

                <div className="flex flex-wrap gap-3 text-sm">
                  <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                    <Mail className="h-4 w-4" /> {r.email}
                  </a>
                  {r.phone && (
                    <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      <Phone className="h-4 w-4" /> {r.phone}
                    </a>
                  )}
                </div>

                <p className="whitespace-pre-wrap rounded-lg bg-secondary/50 p-3 text-sm">{r.needs}</p>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {r.team_size && <span>{l('Team', 'Equipo', 'Team')}: {r.team_size}</span>}
                  {r.sites_count && <span>{l('Sites', 'Sitios', 'Standorte')}: {r.sites_count}</span>}
                  {r.current_tools && <span>{l('Uses', 'Usa', 'Nutzt')}: {r.current_tools}</span>}
                </div>

                <div className="flex flex-wrap gap-2">
                  {STATUSES.filter((s) => s !== r.status).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: r.id, status: s })}
                    >
                      {s === 'contacted'
                        ? l('Mark contacted', 'Marcar contactado', 'Als kontaktiert markieren')
                        : s === 'approved'
                          ? l('Approve', 'Aprobar', 'Genehmigen')
                          : s === 'rejected'
                            ? l('Reject', 'Rechazar', 'Ablehnen')
                            : l('Mark new', 'Marcar nuevo', 'Als neu markieren')}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
