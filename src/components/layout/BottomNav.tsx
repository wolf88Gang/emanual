import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Map, Briefcase, Box, ClipboardList, Clock, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgType } from '@/hooks/usePlantOps';
import { useModules } from '@/hooks/useModules';
import { moduleLabel } from '@/lib/homeGuideModules';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hideForVendor?: boolean;
}

export function BottomNav() {
  const { language } = useLanguage();
  const { hasRole } = useAuth();
  const { isPlantRental } = useOrgType();
  const { navModules } = useModules();
  const location = useLocation();

  const isCrew = hasRole('crew');
  const isVendor = hasRole('vendor');
  const es = language === 'es';
  const de = language === 'de';
  const t = (en: string, esL: string, deL: string) => (es ? esL : de ? deL : en);

  // No generic bottom bar: entries come from the modules the organization enabled
  // and the role of the signed-in user. Four module entries + "More" for settings.
  const moduleItems: NavItem[] = [
    ...navModules.slice(0, isCrew ? 5 : 4).map((m) => ({
      path: m.navRoute!,
      icon: m.icon,
      label: moduleLabel(m.key, language),
    })),
    ...(isCrew ? [] : [{ path: '/plantops/settings', icon: MoreHorizontal, label: t('More', 'Más', 'Mehr') }]),
  ];

  // Priority items on top: Map, Assets, Tasks, Shift/Work
  const estateItems: NavItem[] = [
    { path: '/map', icon: Map, label: t('Map', 'Mapa', 'Karte'), hideForVendor: true },
    { path: '/assets', icon: Box, label: t('Assets', 'Activos', 'Anlagen'), hideForVendor: true },
    { path: '/tasks', icon: ClipboardList, label: t('Tasks', 'Tareas', 'Aufgaben') },
    { path: isCrew ? '/checkin' : '/', icon: isCrew ? Clock : Briefcase, label: isCrew ? t('Shift', 'Turno', 'Schicht') : t('Work', 'Trabajo', 'Arbeit') },
  ];

  // PlantOps (plant_rental) organizations have no fixed mobile bottom bar at all:
  // navigation happens through the drawer/sidebar and contextual page actions.
  if (isPlantRental) return null;

  const navItems = estateItems.filter((item) => !(isVendor && item.hideForVendor));

  if (navItems.length === 0) return null;


  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border lg:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-all min-w-[56px]',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'scale-110')} />
              <span className="text-xs font-medium truncate max-w-[64px] text-center">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
