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
          <header className="h-12 flex items-center justify-between border-b border-border px-3 sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
            <SidebarTrigger className="h-8 w-8" />
            <div className="flex items-center gap-1">
              <NotificationBell />
              <ThemeToggle />
              <LanguagePicker />
            </div>
          </header>
          <TrialBanner />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
