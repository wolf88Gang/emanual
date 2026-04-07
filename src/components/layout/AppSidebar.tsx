import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Briefcase, Map, Box, ClipboardList, FolderOpen, Settings, Package,
  Leaf, Clock, Users, BarChart3, CreditCard, Activity, Wrench,
  Mountain, DollarSign, BookOpen, LayoutDashboard, Recycle, ShoppingBag, Wand2, MessageSquarePlus, Megaphone
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tooltip: string;
}

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole, isOwnerOrManager, isPlatformAdmin, signOut, profile } = useAuth();
  const { language, tl } = useLanguage();
  const [orgType, setOrgType] = useState<string>('residential');

  const isCrew = hasRole('crew');
  const isVendor = hasRole('vendor');
  const isClient = hasRole('client');

  useEffect(() => {
    if (profile?.org_id) {
      supabase.from('organizations').select('org_type').eq('id', profile.org_id).single()
        .then(({ data }) => { if (data) setOrgType((data as any).org_type || 'residential'); });
    }
  }, [profile?.org_id]);

  const isLandscaper = orgType === 'landscaping_company' || orgType === 'hybrid';
  const isPropManager = orgType === 'property_management';

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

  // --- Build owner/manager nav based on org type ---
  // Core items every owner/manager sees
  const coreNav: NavItem[] = [
    { path: '/', icon: Briefcase, label: l('Work', 'Trabajo', 'Arbeit'), tooltip: l('Work view', 'Vista de trabajo', 'Arbeitsansicht') },
    { path: '/map', icon: Map, label: l('Map', 'Mapa', 'Karte'), tooltip: l('Interactive map', 'Mapa interactivo', 'Interaktive Karte') },
    { path: '/assets', icon: Box, label: l('Assets', 'Activos', 'Anlagen'), tooltip: l('Manage assets', 'Gestionar activos', 'Anlagen verwalten') },
    { path: '/tasks', icon: ClipboardList, label: l('Tasks', 'Tareas', 'Aufgaben'), tooltip: l('Task list', 'Lista de tareas', 'Aufgabenliste') },
    { path: '/plants', icon: Leaf, label: l('Plants', 'Plantas', 'Pflanzen'), tooltip: l('Plant registry', 'Registro de plantas', 'Pflanzenregister') },
    { path: '/documents', icon: FolderOpen, label: l('Documents', 'Documentos', 'Dokumente'), tooltip: l('Files & documents', 'Archivos y documentos', 'Dateien & Dokumente') },
  ];

  // Landscaper-only items
  const landscaperNav: NavItem[] = [
    { path: '/labor', icon: DollarSign, label: l('Labor', 'Laboral', 'Arbeit'), tooltip: l('Labor management', 'Gestión laboral', 'Arbeitsverwaltung') },
    { path: '/crm', icon: ShoppingBag, label: l('Sales', 'Ventas', 'Verkauf'), tooltip: l('Clients, invoices & payments', 'Clientes, facturas y pagos', 'Kunden, Rechnungen & Zahlungen') },
    { path: '/my-jobs', icon: Megaphone, label: l('Jobs', 'Empleos', 'Jobs'), tooltip: l('Job postings & marketplace', 'Publicaciones de empleo', 'Stellenangebote & Marktplatz') },
  ];

  // Property manager items (invoicing + financials)
  const propManagerNav: NavItem[] = [
    { path: '/crm', icon: ShoppingBag, label: l('Invoicing', 'Facturación', 'Rechnungen'), tooltip: l('Clients, invoices & billing', 'Clientes, facturas y cobros', 'Kunden, Rechnungen & Abrechnung') },
    { path: '/financials', icon: DollarSign, label: l('Financials', 'Finanzas', 'Finanzen'), tooltip: l('Tax tracking & expenses', 'Seguimiento fiscal y gastos', 'Steuerverfolgung & Ausgaben') },
    { path: '/labor', icon: Clock, label: l('Labor', 'Laboral', 'Arbeit'), tooltip: l('Labor management', 'Gestión laboral', 'Arbeitsverwaltung') },
  ];

  // Homeowner financials
  const homeownerNav: NavItem[] = [
    { path: '/financials', icon: DollarSign, label: l('Financials', 'Finanzas', 'Finanzen'), tooltip: l('Tax tracking & expenses', 'Seguimiento fiscal y gastos', 'Steuerverfolgung & Ausgaben') },
  ];

  // Optional / advanced items
  const advancedNav: NavItem[] = [
    { path: '/inventory', icon: Package, label: l('Inventory', 'Inventario', 'Inventar'), tooltip: l('Tools & supplies', 'Herramientas y suministros', 'Werkzeuge & Materialien') },
    { path: '/compost', icon: Recycle, label: 'Compost', tooltip: l('Compost manager', 'Gestor de compost', 'Kompostverwaltung') },
    { path: '/topography', icon: Mountain, label: l('Topography', 'Topografía', 'Topographie'), tooltip: l('Topographic analysis', 'Análisis topográfico', 'Topographische Analyse') },
    { path: '/reports', icon: BookOpen, label: l('Reports', 'Reportes', 'Berichte'), tooltip: l('Reports & manuals', 'Reportes y manuales', 'Berichte & Handbücher') },
  ];

  const settingsNav: NavItem[] = [
    { path: '/admin', icon: Settings, label: 'Admin', tooltip: l('Settings', 'Configuración', 'Einstellungen') },
    { path: '/setup-wizard', icon: Wand2, label: l('Setup Wizard', 'Asistente', 'Assistent'), tooltip: l('Guided asset setup', 'Asistente de configuración', 'Geführte Anlageneinrichtung') },
    { path: '/requests', icon: MessageSquarePlus, label: l('Requests', 'Solicitudes', 'Anfragen'), tooltip: l('Feature requests & feedback', 'Solicitudes y comentarios', 'Anfragen & Feedback') },
  ];

  const ownerNav: NavItem[] = [
    ...coreNav,
    ...(isLandscaper ? landscaperNav : homeownerNav),
    ...advancedNav,
    ...settingsNav,
  ];

  // Crew nav
  const crewNav: NavItem[] = [
    { path: '/', icon: Briefcase, label: l('Work', 'Trabajo', 'Arbeit'), tooltip: l('Work view', 'Vista de trabajo', 'Arbeitsansicht') },
    { path: '/map', icon: Map, label: l('Map', 'Mapa', 'Karte'), tooltip: l('Map', 'Mapa', 'Karte') },
    { path: '/checkin', icon: Clock, label: l('Shift', 'Turno', 'Schicht'), tooltip: l('Clock in/out', 'Registrar turno', 'Ein-/Ausstempeln') },
    { path: '/tasks', icon: ClipboardList, label: l('Tasks', 'Tareas', 'Aufgaben'), tooltip: l('My tasks', 'Mis tareas', 'Meine Aufgaben') },
    { path: '/assets', icon: Box, label: l('Assets', 'Activos', 'Anlagen'), tooltip: l('View assets', 'Ver activos', 'Anlagen ansehen') },
  ];

  // Vendor nav
  const vendorNav: NavItem[] = [
    { path: '/', icon: Briefcase, label: l('Work', 'Trabajo', 'Arbeit'), tooltip: l('Work view', 'Vista de trabajo', 'Arbeitsansicht') },
    { path: '/tasks', icon: ClipboardList, label: l('Tasks', 'Tareas', 'Aufgaben'), tooltip: l('Assigned tasks', 'Tareas asignadas', 'Zugewiesene Aufgaben') },
    { path: '/my-profile', icon: Users, label: l('Profile', 'Perfil', 'Profil'), tooltip: l('Edit profile & view ratings', 'Editar perfil y ver reseñas', 'Profil bearbeiten') },
    { path: '/jobs', icon: Wrench, label: l('Job Board', 'Bolsa de Trabajo', 'Jobbörse'), tooltip: l('Find work opportunities', 'Buscar oportunidades de trabajo', 'Arbeitsmöglichkeiten finden') },
  ];

  // Client nav - dynamically built based on permissions (all items shown, permission enforcement in pages)
  const clientNav: NavItem[] = [
    { path: '/map', icon: Map, label: l('Map', 'Mapa', 'Karte'), tooltip: l('Property map', 'Mapa de propiedad', 'Grundstückskarte') },
    { path: '/assets', icon: Box, label: l('Assets', 'Activos', 'Anlagen'), tooltip: l('View assets', 'Ver activos', 'Anlagen ansehen') },
    { path: '/tasks', icon: ClipboardList, label: l('Tasks', 'Tareas', 'Aufgaben'), tooltip: l('View tasks', 'Ver tareas', 'Aufgaben ansehen') },
    { path: '/documents', icon: FolderOpen, label: l('Documents', 'Documentos', 'Dokumente'), tooltip: l('Documents', 'Documentos', 'Dokumente') },
    { path: '/reports', icon: BookOpen, label: l('Reports', 'Reportes', 'Berichte'), tooltip: l('Reports', 'Reportes', 'Berichte') },
  ];

  let navItems: NavItem[];
  let groupLabel: string;

  if (isPlatformAdmin) {
    navItems = adminNav;
    groupLabel = 'Platform';
  } else if (isClient) {
    navItems = clientNav;
    groupLabel = l('My Property', 'Mi Propiedad', 'Meine Immobilie');
  } else if (isVendor) {
    navItems = vendorNav;
    groupLabel = l('Vendor', 'Proveedor', 'Lieferant');
  } else if (isCrew) {
    navItems = crewNav;
    groupLabel = l('Crew', 'Equipo', 'Team');
  } else {
    navItems = ownerNav;
    groupLabel = l('Management', 'Gestión', 'Verwaltung');
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Brand */}
        <div className={`flex items-center gap-2 px-3 pb-4 ${collapsed ? 'justify-center' : ''}`} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
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
                      <SidebarMenuButton
                        isActive={isActive(item.path)}
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                          navigate(item.path);
                        }}
                        className={cn(
                          "cursor-pointer",
                          isActive(item.path) && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
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

      <SidebarFooter className="safe-area-pb">
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
              {l('Sign out', 'Cerrar sesión', 'Abmelden')}
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
