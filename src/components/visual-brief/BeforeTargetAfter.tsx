import React from 'react';
import type { VisualAsset } from '@/lib/visualBriefs';
import { useVbCopy } from './copy';

interface Props {
  assets: VisualAsset[];
  urls: Record<string, string>;
  pins?: Array<{ visual_asset_id: string; x: number; y: number; note: string | null }>;
  compact?: boolean;
}

/** Before → Target → After comparison in responsive columns. */
export function BeforeTargetAfter({ assets, urls, pins = [], compact = false }: Props) {
  const { t } = useVbCopy();
  const before = assets.filter(a => a.kind === 'before');
  const agreed = assets.filter(a => a.kind === 'agreed_target');
  const target = agreed.length ? agreed : assets.filter(a => a.kind === 'target_reference');
  const after = assets.filter(a => a.kind === 'after');
  const cols: Array<[string, VisualAsset[]]> = [
    [t.current, before],
    [agreed.length ? t.agreedRef : t.reference, target],
    [t.final, after.slice(-1)],
  ];
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {cols.map(([label, list]) => (
        <figure key={label} className="min-w-0 space-y-1">
          <figcaption className="text-[11px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</figcaption>
          {list.length === 0 ? (
            <div className={`${compact ? 'h-20' : 'h-28 sm:h-40'} rounded-md border border-dashed border-border bg-muted/40`} />
          ) : (
            list.slice(0, compact ? 1 : 3).map(a => {
              const url = urls[`${a.bucket}/${a.storage_path}`];
              const own = pins.filter(p => p.visual_asset_id === a.id);
              return (
                <div key={a.id} className="relative">
                  {url ? <img src={url} alt={label} loading="lazy" className={`${compact ? 'h-20' : 'h-28 sm:h-40'} w-full rounded-md object-cover`} />
                    : <div className={`${compact ? 'h-20' : 'h-28 sm:h-40'} rounded-md bg-muted`} />}
                  {!compact && own.map((p, i) => (
                    <span key={i} title={p.note ?? ''} className="absolute -translate-x-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold ring-2 ring-background"
                      style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>{i + 1}</span>
                  ))}
                  {!compact && own.length > 0 && (
                    <ol className="mt-1 space-y-0.5 text-[11px] text-muted-foreground list-decimal list-inside">
                      {own.map((p, i) => <li key={i}>{p.note || '—'}</li>)}
                    </ol>
                  )}
                </div>
              );
            })
          )}
        </figure>
      ))}
    </div>
  );
}
