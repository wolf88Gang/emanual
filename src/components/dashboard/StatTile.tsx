import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';

export interface StatTileProps {
  label: string;
  value: number | null | undefined;
  icon: LucideIcon;
  hint?: string;
  /** Renders a mini bar strip under the value for a sense of volume. */
  spark?: number[];
  onClick?: () => void;
  /** Entrance stagger index. */
  index?: number;
  tone?: 'primary' | 'accent' | 'info' | 'muted';
  className?: string;
}

const toneMap: Record<NonNullable<StatTileProps['tone']>, string> = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/15 text-accent-foreground',
  info: 'bg-info/10 text-info',
  muted: 'bg-muted text-muted-foreground',
};

/**
 * Dense metric tile: animated counter, icon chip, optional micro-bars and a
 * hover lift. Purely presentational — data stays in the page.
 */
export function StatTile({
  label,
  value,
  icon: Icon,
  hint,
  spark,
  onClick,
  index = 0,
  tone = 'primary',
  className,
}: StatTileProps) {
  const animated = useCountUp(value ?? 0);
  const unknown = value === null || value === undefined;
  const max = spark && spark.length ? Math.max(...spark, 1) : 1;
  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      onClick={onClick}
      style={{ animationDelay: `${index * 70}ms` }}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/70 bg-card p-4 text-left animate-rise-in',
        'shadow-[var(--shadow-sm)] transition-all duration-300',
        onClick && 'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-105', toneMap[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="mt-3 font-display text-3xl font-semibold tabular-nums leading-none">
        {unknown ? '—' : animated}
      </p>

      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}

      {spark && spark.length > 0 && (
        <div className="mt-3 flex h-8 items-end gap-1" aria-hidden>
          {spark.map((v, i) => (
            <span
              key={i}
              className="flex-1 origin-bottom rounded-sm bg-primary/25 animate-bar-grow transition-colors duration-300 group-hover:bg-primary/40"
              style={{ height: `${Math.max(8, (v / max) * 100)}%`, animationDelay: `${index * 70 + i * 45}ms` }}
            />
          ))}
        </div>
      )}
    </Comp>
  );
}

/** Matching skeleton so loading state keeps the same rhythm as the real grid. */
export function StatTileSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      style={{ animationDelay: `${index * 70}ms` }}
      className="relative overflow-hidden rounded-xl border border-border/70 bg-card p-4 animate-rise-in"
    >
      <div className="h-3 w-20 rounded bg-muted" />
      <div className="mt-4 h-7 w-14 rounded bg-muted" />
      <div className="mt-3 h-8 w-full rounded bg-muted/60" />
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
      />
    </div>
  );
}
