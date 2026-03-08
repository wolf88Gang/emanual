import React, { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { TrialBanner } from '@/components/subscription/TrialBanner';

interface SidebarLayoutProps {
  children: ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b border-border px-3 sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
            <SidebarTrigger className="h-8 w-8" />
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={toggleLanguage} className="text-xs h-8">
                {language === 'en' ? '🇪🇸' : '🇺🇸'}
              </Button>
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
