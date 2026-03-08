import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Briefcase, Map, Box, ClipboardList, FolderOpen, Settings, Package,
  Leaf, Clock, Users, BarChart3, CreditCard, Activity, Wrench,
  Mountain, DollarSign, BookOpen, LayoutDashboard, Recycle, ShoppingBag
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
  const { language } = useLanguage();
  const es = language === 'es';

  const isCrew = hasRole('crew');
  const isVendor = hasRole('vendor');

  // Platform Admin nav
  const adminNav: NavItem[] = [
    { path: '/platform', icon: LayoutDashboard, label: 'Dashboard', tooltip: es ? 'Panel de control' : 'Dashboard' },
    { path: '/platform/clients', icon: Users, label: es ? 'Clientes' : 'Clients', tooltip: es ? 'Gestionar clientes' : 'Manage clients' },
    { path: '/platform/subscriptions', icon: CreditCard, label: es ? 'Suscripciones' : 'Subscriptions', tooltip: es ? 'Planes y pagos' : 'Plans & payments' },
    { path: '/platform/payments', icon: DollarSign, label: es ? 'Pagos' : 'Payments', tooltip: es ? 'Historial de pagos PayPal' : 'PayPal payment history' },
    { path: '/platform/metrics', icon: BarChart3, label: es ? 'Métricas' : 'Metrics', tooltip: es ? 'Uso y estadísticas' : 'Usage & statistics' },
    { path: '/platform/system', icon: Activity, label: es ? 'Sistema' : 'System', tooltip: es ? 'Salud del sistema' : 'System health' },
  ];

  // Account Owner / Manager nav
  const ownerNav: NavItem[] = [
    { path: '/', icon: Briefcase, label: es ? 'Trabajo' : 'Work', tooltip: es ? 'Vista de trabajo' : 'Work view' },
    { path: '/map', icon: Map, label: es ? 'Mapa' : 'Map', tooltip: es ? 'Mapa interactivo' : 'Interactive map' },
    { path: '/assets', icon: Box, label: es ? 'Activos' : 'Assets', tooltip: es ? 'Gestionar activos' : 'Manage assets' },
    { path: '/tasks', icon: ClipboardList, label: es ? 'Tareas' : 'Tasks', tooltip: es ? 'Lista de tareas' : 'Task list' },
    { path: '/plants', icon: Leaf, label: es ? 'Plantas' : 'Plants', tooltip: es ? 'Registro de plantas' : 'Plant registry' },
    { path: '/inventory', icon: Package, label: es ? 'Inventario' : 'Inventory', tooltip: es ? 'Herramientas y suministros' : 'Tools & supplies' },
    { path: '/documents', icon: FolderOpen, label: es ? 'Documentos' : 'Documents', tooltip: es ? 'Archivos y documentos' : 'Files & documents' },
    { path: '/labor', icon: DollarSign, label: es ? 'Laboral' : 'Labor', tooltip: es ? 'Gestión laboral' : 'Labor management' },
    { path: '/compost', icon: Recycle, label: 'Compost', tooltip: es ? 'Gestor de compost' : 'Compost manager' },
    { path: '/crm', icon: ShoppingBag, label: es ? 'Ventas' : 'Sales', tooltip: es ? 'Clientes, facturas y pagos' : 'Clients, invoices & payments' },
    { path: '/topography', icon: Mountain, label: es ? 'Topografía' : 'Topography', tooltip: es ? 'Análisis topográfico' : 'Topographic analysis' },
    { path: '/reports', icon: BookOpen, label: es ? 'Reportes' : 'Reports', tooltip: es ? 'Reportes y manuales' : 'Reports & manuals' },
    { path: '/admin', icon: Settings, label: es ? 'Admin' : 'Admin', tooltip: es ? 'Configuración' : 'Settings' },
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
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Leaf className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-sm font-serif font-semibold text-primary truncate">
              Casa Guide
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
