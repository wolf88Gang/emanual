import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, CreditCard, LayoutDashboard, LogOut, Users } from 'lucide-react';
import { HGLogo } from '@/components/HGLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguagePicker } from '@/components/LanguagePicker';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/platform', label: 'Console', icon: LayoutDashboard },
  { to: '/platform/clients', label: 'Clients', icon: Building2 },
  { to: '/platform/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/platform/metrics', label: 'Metrics', icon: Users },
];

/**
 * Global platform-admin shell. Deliberately free of tenant concerns:
 * no estate context, no subscription provider, no onboarding guards.
 */
export function PlatformLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header
        className="sticky top-0 z-40 border-b border-border bg-card"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <HGLogo size="sm" />
            <span className="font-display font-semibold truncate">Home Guide · Platform</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguagePicker />
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
