import React from 'react';
import { cn } from '@/lib/utils';

export interface QuickAction {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  /** Renders as the emphasized primary shortcut. */
  primary?: boolean;
  /** Small count/status pill on the right of the chip. */
  badge?: string | number;
}

interface QuickActionRailProps {
  actions: QuickAction[];
  className?: string;
  /** Sticks the rail under the app header while scrolling. */
  sticky?: boolean;
}

/**
 * Horizontal rail of interactive shortcuts placed at the top of a dashboard.
 * Purely presentational — every destination/handler is supplied by the page,
 * so each profile shows only the shortcuts it is actually allowed to use.
 */
export function QuickActionRail({ actions, className, sticky = true }: QuickActionRailProps) {
  if (actions.length === 0) return null;

  return (
    <div
      className={cn(
        'animate-rise-in -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        sticky && 'sticky top-0 z-30 bg-background/85 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70',
        className,
      )}
    >
      {actions.map((a, i) => (
        <button
          key={a.key}
          onClick={a.onClick}
          style={{ animationDelay: `${i * 45}ms` }}
          className={cn(
            'group animate-rise-in flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium',
            'transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            a.primary
              ? 'border-primary bg-primary text-primary-foreground shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]'
              : 'border-border/70 bg-card text-foreground hover:border-primary/45 hover:bg-muted/50',
          )}
        >
          <a.icon
            className={cn(
              'h-4 w-4 transition-transform duration-200 group-hover:scale-110',
              a.primary ? '' : 'text-primary',
            )}
          />
          <span className="whitespace-nowrap">{a.label}</span>
          {a.badge !== undefined && a.badge !== '' && (
            <span
              className={cn(
                'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                a.primary ? 'bg-primary-foreground/20' : 'bg-primary/10 text-primary',
              )}
            >
              {a.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
