import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Briefcase, Map, Box, ClipboardList, FolderOpen, Settings, Package,
  Leaf, Clock, Users, BarChart3, CreditCard, Activity, Wrench,
  Mountain, DollarSign, BookOpen, LayoutDashboard, Recycle, ShoppingBag, Wand2
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tooltip: string;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { hasRole, isOwnerOrManager, isPlatformAdmin, signOut, profile } = useAuth();
  const { language, tl } = useLanguage();

  const isCrew = hasRole('crew');
  const isVendor = hasRole('vendor');

  const l = (en: string, es: string, de: string) => tl({ en, es, de });

  // Platform Admin nav
  const adminNav: NavItem[] = [
    { path: '/platform', icon: LayoutDashboard, label: 'Dashboard', tooltip: l('Dashboard', 'Panel de control', 'Dashboard') },
    { path: '/platform/clients', icon: Users, label: l('Clients', 'Clientes', 'Kunden'), tooltip: l('Manage clients', 'Gestionar clientes', 'Kunden verwalten') },
    { path: '/platform/subscriptions', icon: CreditCard, label: l('Subscriptions', 'Suscripciones', 'Abonnements'), tooltip: l('Plans & payments', 'Planes y pagos', 'Pläne & Zahlungen') },
    { path: '/platform/payments', icon: DollarSign, label: l('Payments', 'Pagos', 'Zahlungen'), tooltip: l('Payment history', 'Historial de pagos', 'Zahlungsverlauf') },
    { path: '/platform/metrics', icon: BarChart3, label: l('Metrics', 'Métricas', 'Metriken'), tooltip: l('Usage & statistics', 'Uso y estadísticas', 'Nutzung & Statistiken') },
    { path: '/platform/system', icon: Activity, label: l('System', 'Sistema', 'System'), tooltip: l('System health', 'Salud del sistema', 'Systemzustand') },
  ];

  // Account Owner / Manager nav
  const ownerNav: NavItem[] = [
    { path: '/', icon: Briefcase, label: l('Work', 'Trabajo', 'Arbeit'), tooltip: l('Work view', 'Vista de trabajo', 'Arbeitsansicht') },
    { path: '/map', icon: Map, label: l('Map', 'Mapa', 'Karte'), tooltip: l('Interactive map', 'Mapa interactivo', 'Interaktive Karte') },
    { path: '/assets', icon: Box, label: l('Assets', 'Activos', 'Anlagen'), tooltip: l('Manage assets', 'Gestionar activos', 'Anlagen verwalten') },
    { path: '/tasks', icon: ClipboardList, label: l('Tasks', 'Tareas', 'Aufgaben'), tooltip: l('Task list', 'Lista de tareas', 'Aufgabenliste') },
    { path: '/plants', icon: Leaf, label: l('Plants', 'Plantas', 'Pflanzen'), tooltip: l('Plant registry', 'Registro de plantas', 'Pflanzenregister') },
    { path: '/inventory', icon: Package, label: l('Inventory', 'Inventario', 'Inventar'), tooltip: l('Tools & supplies', 'Herramientas y suministros', 'Werkzeuge & Materialien') },
    { path: '/documents', icon: FolderOpen, label: l('Documents', 'Documentos', 'Dokumente'), tooltip: l('Files & documents', 'Archivos y documentos', 'Dateien & Dokumente') },
    { path: '/labor', icon: DollarSign, label: l('Labor', 'Laboral', 'Arbeit'), tooltip: l('Labor management', 'Gestión laboral', 'Arbeitsverwaltung') },
    { path: '/compost', icon: Recycle, label: 'Compost', tooltip: l('Compost manager', 'Gestor de compost', 'Kompostverwaltung') },
    { path: '/crm', icon: ShoppingBag, label: l('Sales', 'Ventas', 'Verkauf'), tooltip: l('Clients, invoices & payments', 'Clientes, facturas y pagos', 'Kunden, Rechnungen & Zahlungen') },
    { path: '/topography', icon: Mountain, label: l('Topography', 'Topografía', 'Topographie'), tooltip: l('Topographic analysis', 'Análisis topográfico', 'Topographische Analyse') },
    { path: '/reports', icon: BookOpen, label: l('Reports', 'Reportes', 'Berichte'), tooltip: l('Reports & manuals', 'Reportes y manuales', 'Berichte & Handbücher') },
    { path: '/admin', icon: Settings, label: 'Admin', tooltip: l('Settings', 'Configuración', 'Einstellungen') },
    { path: '/setup-wizard', icon: Wand2, label: l('Setup Wizard', 'Asistente', 'Assistent'), tooltip: l('Guided asset setup', 'Asistente de configuración', 'Geführte Anlageneinrichtung') },
  ];

  // Crew nav
  const crewNav: NavItem[] = [
    { path: '/', icon: Briefcase, label: es ? 'Trabajo' : 'Work', tooltip: es ? 'Vista de trabajo' : 'Work view' },
    { path: '/map', icon: Map, label: es ? 'Mapa' : 'Map', tooltip: es ? 'Mapa' : 'Map' },
    { path: '/checkin', icon: Clock, label: es ? 'Turno' : 'Shift', tooltip: es ? 'Registrar turno' : 'Clock in/out' },
    { path: '/tasks', icon: ClipboardList, label: es ? 'Tareas' : 'Tasks', tooltip: es ? 'Mis tareas' : 'My tasks' },
    { path: '/assets', icon: Box, label: es ? 'Activos' : 'Assets', tooltip: es ? 'Ver activos' : 'View assets' },
  ];

  // Vendor nav
  const vendorNav: NavItem[] = [
    { path: '/', icon: Briefcase, label: es ? 'Trabajo' : 'Work', tooltip: es ? 'Vista de trabajo' : 'Work view' },
    { path: '/tasks', icon: ClipboardList, label: es ? 'Tareas' : 'Tasks', tooltip: es ? 'Tareas asignadas' : 'Assigned tasks' },
  ];

  let navItems: NavItem[];
  let groupLabel: string;

  if (isPlatformAdmin) {
    navItems = adminNav;
    groupLabel = 'Platform';
  } else if (isVendor) {
    navItems = vendorNav;
    groupLabel = es ? 'Proveedor' : 'Vendor';
  } else if (isCrew) {
    navItems = crewNav;
    groupLabel = es ? 'Equipo' : 'Crew';
  } else {
    navItems = ownerNav;
    groupLabel = es ? 'Gestión' : 'Management';
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Brand */}
        <div className={`flex items-center gap-2 px-3 py-4 ${collapsed ? 'justify-center' : ''}`}>
          <img src="/images/hg-logo.png" alt="HG" className="w-8 h-8 object-contain flex-shrink-0" />
          {!collapsed && (
            <span className="text-sm font-serif font-semibold text-primary truncate">
              Home Guide
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton asChild isActive={isActive(item.path)}>
                        <NavLink
                          to={item.path}
                          end={item.path === '/'}
                          className="hover:bg-muted/50"
                          activeClassName="bg-primary/10 text-primary font-medium"
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.tooltip}
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className={`flex items-center gap-2 px-2 py-2 ${collapsed ? 'justify-center' : ''}`}>
          {!collapsed && profile && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {profile.full_name || profile.email}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{profile.email}</p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {es ? 'Cerrar sesión' : 'Sign out'}
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
