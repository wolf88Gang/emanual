import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Loader2, Search, AlertTriangle, ChevronRight } from 'lucide-react';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlantOpsData } from '@/hooks/usePlantOps';
import { careState, formatDateEs, CARE_RESPONSIBILITY_LABELS, type CareResponsibility } from '@/lib/plantopsCare';

type Filter = 'all' | 'review' | 'water';

/**
 * Care overview: every installed placement and the state of its operational plan.
 * Placements with no operational base are surfaced first as "needs review".
 */
export default function PlantOpsCare() {
  const navigate = useNavigate();
  const { language, tl } = useLanguage();
  const { placements, loading } = usePlantOpsData();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const l = (en: string, es: string, de?: string) =>
    language === 'es' ? es : language === 'de' ? (de ?? en) : en;

  useEffect(() => {
    document.title = l('Care plans | PlantOps', 'Planes de cuidado | PlantOps');
  }, [language]);

  const rows = useMemo(() => {
    const installed = placements.filter((p: any) => p.status === 'installed');
    const enriched = installed.map((p: any) => {
      const hasBase = p.water_interval_days != null;
      const state = hasBase ? careState(p.next_water_due, p.water_interval_days) : 'revisar';
      return { ...p, hasBase, state };
    });
    const needle = q.trim().toLowerCase();
    return enriched
      .filter((p) => {
        if (filter === 'review' && p.hasBase) return false;
        if (filter === 'water' && p.state !== 'regar') return false;
        if (!needle) return true;
        return [p.asset?.name, p.estate?.name, p.zone?.name, p.spot_label]
          .filter(Boolean)
          .some((v: string) => v.toLowerCase().includes(needle));
      })
      .sort((a, b) => {
        const rank = (r: any) => (!r.hasBase ? 0 : r.state === 'regar' ? 1 : 2);
        return rank(a) - rank(b) || (a.next_water_due ?? '9999').localeCompare(b.next_water_due ?? '9999');
      });
  }, [placements, q, filter]);

  const pendingReview = rows.filter((r) => !r.hasBase).length;

  return (
    <ModernAppLayout>
      <main className="p-4 space-y-4 safe-area-content max-w-3xl mx-auto pb-24">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Leaf className="h-6 w-6 text-primary" />
            {l('Care plans', 'Planes de cuidado', 'Pflegepläne')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {l('Operational plan per plant. The species guide is reference only.',
               'Plan operativo por planta. La guía de especie es solo referencia.',
               'Betriebsplan pro Pflanze. Der Artenleitfaden ist nur Referenz.')}
          </p>
        </div>

        {pendingReview > 0 && (
          <Card className="border-amber-500/40">
            <CardContent className="p-3 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              {l(`${pendingReview} plant(s) have no watering interval defined.`,
                 `${pendingReview} planta(s) sin intervalo de riego definido.`,
                 `${pendingReview} Pflanze(n) ohne Gießintervall.`)}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={l('Search plant or property', 'Buscar planta o propiedad', 'Suchen')}
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['all', 'review', 'water'] as Filter[]).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
              {f === 'all' ? l('All', 'Todas', 'Alle')
                : f === 'review' ? l('Needs review', 'Revisar', 'Prüfen')
                : l('Water today', 'Regar hoy', 'Heute gießen')}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            {l('No plants match this filter.', 'Ninguna planta coincide con este filtro.', 'Keine Treffer.')}
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {rows.map((p: any) => (
              <Card
                key={p.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/plantops/cuidados/${p.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium truncate">{p.asset?.name ?? '—'}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {[p.estate?.name, p.zone?.name, p.spot_label].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {!p.hasBase ? (
                        <Badge variant="outline" className="border-amber-500/60 text-amber-600 dark:text-amber-400">
                          {l('No interval', 'Sin intervalo', 'Kein Intervall')}
                        </Badge>
                      ) : (
                        <>
                          <Badge variant={p.state === 'regar' ? 'default' : 'secondary'}>
                            {p.state === 'regar' ? l('Water', 'Regar', 'Gießen')
                              : p.state === 'no_regar' ? l('Do not water', 'No regar', 'Nicht gießen')
                              : l('Review', 'Revisar', 'Prüfen')}
                          </Badge>
                          <span className="text-muted-foreground">
                            {l('every', 'cada', 'alle')} {p.water_interval_days} {l('days', 'días', 'Tage')}
                          </span>
                        </>
                      )}
                      {p.next_water_due && (
                        <span className="text-muted-foreground">{formatDateEs(p.next_water_due)}</span>
                      )}
                      {p.care_responsibility && (
                        <Badge variant="outline">
                          {tl(CARE_RESPONSIBILITY_LABELS[p.care_responsibility as CareResponsibility])}
                        </Badge>
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
