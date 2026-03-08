import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Map, Briefcase, Box, ClipboardList, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

export function BottomNav() {
  const { language } = useLanguage();
  const { isOwnerOrManager, hasRole } = useAuth();
  const location = useLocation();
  
  const isCrew = hasRole('crew');
  const isVendor = hasRole('vendor');
  const es = language === 'es';

  // Priority items on top: Map, Assets, Tasks, Shift/Work
  const navItems = [
    { path: '/map', icon: Map, label: es ? 'Mapa' : 'Map', hideForVendor: true },
    { path: '/assets', icon: Box, label: es ? 'Activos' : 'Assets', hideForVendor: true },
    { path: '/tasks', icon: ClipboardList, label: es ? 'Tareas' : 'Tasks' },
    { path: isCrew ? '/checkin' : '/', icon: isCrew ? Clock : Briefcase, label: isCrew ? (es ? 'Turno' : 'Shift') : (es ? 'Trabajo' : 'Work') },
  ].filter(item => {
    if (isVendor && item.hideForVendor) return false;
    return true;
  });

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
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[60px]',
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
