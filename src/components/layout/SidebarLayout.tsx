import React, { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguagePicker } from '@/components/LanguagePicker';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface SidebarLayoutProps {
  children: ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center justify-between border-b border-border/30 px-3 sticky top-0 z-40 bg-sidebar backdrop-blur-sm" style={{
            paddingTop: 'calc(env(safe-area-inset-top) + 0.25rem)',
            paddingBottom: '0.25rem',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right))'
          }}>
            <SidebarTrigger className="h-8 w-8" />
            <div className="flex items-center gap-1">
              <NotificationBell />
              <ThemeToggle />
              <LanguagePicker />
            </div>
          </header>
          <TrialBanner />
          <main className="flex-1 overflow-auto safe-area-content">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
