import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardPanelProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  index?: number;
  className?: string;
}

/**
 * Framed dashboard panel with a quiet header rail and staggered entrance.
 */
export function DashboardPanel({ title, description, action, children, index = 0, className }: DashboardPanelProps) {
  return (
    <section
      style={{ animationDelay: `${index * 90}ms` }}
      className={cn(
        'animate-rise-in rounded-xl border border-border/70 bg-card shadow-[var(--shadow-sm)]',
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold leading-tight">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
