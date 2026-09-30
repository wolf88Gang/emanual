import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { signAssets, type VisualAsset, type BriefStatus } from '@/lib/visualBriefs';
import { BeforeTargetAfter } from './BeforeTargetAfter';
import { useVbCopy } from './copy';

interface Row { id: string; status: BriefStatus; service_type: string; created_at: string; task: { title: string } }

/** Visual service history for one asset (plant). */
export function PlantVisualHistory({ assetId }: { assetId: string }) {
  const { t, lang } = useVbCopy();
  const [rows, setRows] = useState<Row[]>([]);
  const [assets, setAssets] = useState<VisualAsset[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [types, setTypes] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const [{ data: briefs }, { data: st }] = await Promise.all([
        supabase.from('service_visual_briefs').select('id, status, service_type, created_at, task:tasks!inner(title, asset_id)').eq('task.asset_id', assetId).order('created_at', { ascending: false }),
        supabase.from('service_types').select('*'),
      ]);
      const list = (briefs ?? []) as unknown as Row[];
      setRows(list);
      setTypes(Object.fromEntries((st ?? []).map((s: any) => [s.key, lang === 'es' ? s.label_es : lang === 'de' ? s.label_de : s.label_en])));
      if (list.length) {
        const { data: a } = await supabase.from('service_visual_assets').select('*').in('brief_id', list.map(r => r.id)).is('removed_at', null);
        const all = (a ?? []) as VisualAsset[];
        setAssets(all);
        setUrls(await signAssets(all));
      }
    })();
  }, [assetId, lang]);

  if (!rows.length) return <p className="text-sm text-muted-foreground py-4">{t.noHistory}</p>;
  return (
    <div className="space-y-4">
      {rows.map(r => (
        <article key={r.id} className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-sm">{types[r.service_type] ?? r.service_type} · {r.task?.title}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'dd/MM/yyyy')}</p>
            </div>
            <Badge variant="outline">{t.status[r.status]}</Badge>
          </div>
          <BeforeTargetAfter assets={assets.filter(a => a.brief_id === r.id)} urls={urls} compact />
        </article>
      ))}
    </div>
  );
}

/** Previous after/before photos of an asset, for reuse as a reference. */
export async function loadAssetHistoryPhotos(assetId: string) {
  const { data: briefs } = await supabase.from('service_visual_briefs').select('id, created_at, task:tasks!inner(title, asset_id)').eq('task.asset_id', assetId);
  const ids = (briefs ?? []).map((b: any) => b.id);
  if (!ids.length) return [];
  const { data } = await supabase.from('service_visual_assets').select('*').in('brief_id', ids).in('kind', ['after', 'before']).is('removed_at', null).order('created_at', { ascending: false }).limit(12);
  const list = (data ?? []) as VisualAsset[];
  const urls = await signAssets(list);
  return list.map(a => ({ id: a.id, url: urls[`${a.bucket}/${a.storage_path}`], label: format(new Date(a.created_at), 'dd/MM/yy') })).filter(x => x.url);
}
