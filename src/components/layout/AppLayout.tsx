import React, { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Map, 
  CheckSquare, 
  Box, 
  FolderOpen, 
  Settings,
  LogOut,
  Menu,
  X,
  Globe,
  ChevronDown,
  Building2,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguagePicker } from '@/components/LanguagePicker';
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

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t, language, toggleLanguage } = useLanguage();
  const { user, profile, signOut, isOwnerOrManager, hasRole } = useAuth();
  const { estates, currentEstate, setCurrentEstate } = useEstate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Crew sees: Home, Map, Tasks, Log. 
  // Vendor sees: Home, Tasks, Documents (limited).
  // Owner/Manager sees all.
  const isCrew = hasRole('crew');
  const isVendor = hasRole('vendor');

  const navItems = [
    { path: '/', icon: Home, label: t('nav.home') },
    { path: '/map', icon: Map, label: t('nav.map'), hideForVendor: true },
    { path: '/assets', icon: Box, label: t('nav.assets'), hideForVendor: true, hideForCrew: false },
    { path: '/tasks', icon: CheckSquare, label: t('nav.tasks') },
    { path: '/documents', icon: FolderOpen, label: t('nav.documents'), hideForCrew: true },
    ...(isOwnerOrManager ? [{ path: '/admin', icon: Settings, label: t('nav.admin') }] : []),
  ].filter(item => {
    if (isVendor && item.hideForVendor) return false;
    if (isCrew && item.hideForCrew) return false;
    return true;
  });

  const NavItem = ({ item, mobile = false }: { item: typeof navItems[0]; mobile?: boolean }) => (
    <NavLink
      to={item.path}
      onClick={() => mobile && setMobileOpen(false)}
      className={({ isActive }) =>
        cn(
          'nav-pill',
          isActive && 'active',
          mobile && 'w-full justify-start text-lg py-4'
        )
      }
    >
      <item.icon className="h-5 w-5" />
      <span>{item.label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          {/* Left: Logo + Mobile Menu */}
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-serif font-semibold text-primary">
                      Home Guide
                    </h2>
                  </div>
                  <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                      <NavItem key={item.path} item={item} mobile />
                    ))}
                  </nav>
                  <div className="p-4 border-t border-border">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-lg py-4"
                      onClick={() => {
                        signOut();
                        setMobileOpen(false);
                      }}
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      {t('nav.logout')}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <h1 className="text-xl font-serif font-semibold text-primary hidden sm:block">
              Home Guide
            </h1>
          </div>

          {/* Center: Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </nav>

          {/* Right: Estate Selector + Language + Profile */}
          <div className="flex items-center gap-2">
            {/* Estate Selector */}
            {estates.length > 0 && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 hidden sm:flex">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="max-w-[150px] truncate">
                      {currentEstate?.name || 'Select Estate'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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

            {/* Language Picker */}
            <LanguagePicker />

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b border-border">
                  <p className="font-medium truncate">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
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
      <main className="flex-1">
        <div className="page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
