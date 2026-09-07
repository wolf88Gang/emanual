import React, { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguagePicker } from '@/components/LanguagePicker';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

/**
 * Global platform-admin shell. Deliberately free of tenant concerns:
 * no estate context, no subscription provider, no onboarding guards.
 * Navigation lives in the shared collapsible sidebar (platform entries).
 */
export function PlatformLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header
            className="sticky top-0 z-40 flex items-center justify-between border-b border-border/30 bg-sidebar-background px-3 text-sidebar-foreground"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.25rem)',
              paddingBottom: '0.25rem',
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger className="h-8 w-8" />
              <span className="truncate font-display text-sm font-semibold">Home Guide · Platform</span>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <LanguagePicker />
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto safe-area-content">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
