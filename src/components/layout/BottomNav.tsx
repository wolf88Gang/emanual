import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Map, Briefcase, Box, ClipboardList, Clock, Home, Droplets, Leaf, Users, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgType } from '@/hooks/usePlantOps';

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
  const location = useLocation();

  const isCrew = hasRole('crew');
  const isVendor = hasRole('vendor');
  const es = language === 'es';

  // Plant rental operations never use the estate map; the flow is visits and care.
  // Crew only sees field work — clients and settings are admin modules.
  const plantOpsItems: NavItem[] = [
    { path: '/plantops', icon: Home, label: es ? 'Inicio' : 'Home' },
    { path: '/plantops/visita', icon: Droplets, label: es ? 'Visitas' : 'Visits' },
    { path: '/plantops/care', icon: Leaf, label: es ? 'Cuidados' : 'Care' },
    ...(isCrew
      ? []
      : [
          { path: '/crm', icon: Users, label: es ? 'Clientes' : 'Clients' },
          { path: '/plantops/settings', icon: MoreHorizontal, label: es ? 'Más' : 'More' },
        ]),
  ];

  // Priority items on top: Map, Assets, Tasks, Shift/Work
  const estateItems: NavItem[] = [
    { path: '/map', icon: Map, label: es ? 'Mapa' : 'Map', hideForVendor: true },
    { path: '/assets', icon: Box, label: es ? 'Activos' : 'Assets', hideForVendor: true },
    { path: '/tasks', icon: ClipboardList, label: es ? 'Tareas' : 'Tasks' },
    { path: isCrew ? '/checkin' : '/', icon: isCrew ? Clock : Briefcase, label: isCrew ? (es ? 'Turno' : 'Shift') : (es ? 'Trabajo' : 'Work') },
  ];

  const navItems = (isPlantRental ? plantOpsItems : estateItems).filter(
    (item) => !(isVendor && item.hideForVendor),
  );

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
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
