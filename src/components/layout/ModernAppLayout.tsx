import React, { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Map, 
  Briefcase, 
  Box, 
  ClipboardList, 
  FolderOpen, 
  Settings,
  LogOut,
  Globe,
  ChevronDown,
  Building2,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEstate } from '@/contexts/EstateContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNav } from './BottomNav';
import { ThemeToggle } from '../ThemeToggle';

interface ModernAppLayoutProps {
  children: ReactNode;
}

export function ModernAppLayout({ children }: ModernAppLayoutProps) {
  const { t, language, toggleLanguage } = useLanguage();
  const { user, profile, signOut, isOwnerOrManager, hasRole } = useAuth();
  const { estates, currentEstate, setCurrentEstate } = useEstate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isCrew = hasRole('crew');
  const isVendor = hasRole('vendor');

  const navItems = [
    { path: '/map', icon: Map, label: t('nav.map'), hideForVendor: true },
    { path: '/', icon: Briefcase, label: 'Work' },
    { path: '/assets', icon: Box, label: t('nav.assets'), hideForVendor: true },
    { path: '/tasks', icon: ClipboardList, label: t('nav.log'), hideForCrew: true },
    { path: '/documents', icon: FolderOpen, label: t('nav.documents'), hideForCrew: true, hideForVendor: true },
    ...(isOwnerOrManager ? [{ path: '/admin', icon: Settings, label: t('nav.admin') }] : []),
  ].filter(item => {
    if (isVendor && item.hideForVendor) return false;
    if (isCrew && item.hideForCrew) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Minimal, modern */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-lg">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          {/* Left: Logo + Mobile Menu */}
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-5 border-b border-border">
                    <h2 className="text-lg font-serif font-semibold text-primary">
                      Estate Manual
                    </h2>
                  </div>
                  <nav className="flex-1 p-3 space-y-1">
                    {navItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium',
                            isActive 
                              ? 'bg-primary text-primary-foreground' 
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                          )
                        }
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </nav>
                  <div className="p-3 border-t border-border">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 px-4 py-3"
                      onClick={() => {
                        signOut();
                        setMobileOpen(false);
                      }}
                    >
                      <LogOut className="h-5 w-5" />
                      {t('nav.logout')}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <h1 className="text-lg font-serif font-semibold text-primary">
              Estate Manual
            </h1>
          </div>

          {/* Center: Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 bg-secondary/50 rounded-xl p-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm',
                    isActive 
                      ? 'bg-card text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right: Estate Selector + Language + Profile */}
          <div className="flex items-center gap-1">
            {/* Estate Selector */}
            {estates.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 hidden sm:flex h-9">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="max-w-[100px] truncate text-sm">
                      {currentEstate?.name || 'Select'}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {estates.map((estate) => (
                    <DropdownMenuItem
                      key={estate.id}
                      onClick={() => setCurrentEstate(estate)}
                      className={cn(
                        currentEstate?.id === estate.id && 'bg-primary/10'
                      )}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      {estate.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={toggleLanguage}
              title={language === 'en' ? 'Cambiar a Español' : 'Switch to English'}
            >
              <Globe className="h-4 w-4" />
            </Button>

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2 border-b border-border">
                  <p className="font-medium truncate text-sm">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 lg:pb-0">
        <div className="page-enter">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav />
    </div>
  );
}
