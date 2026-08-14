import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CreditCard, BarChart3, Activity, TrendingUp, AlertTriangle, DollarSign, Building2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PlatformStats {
  totalOrgs: number;
  totalUsers: number;
  totalEstates: number;
  activeSubscriptions: number;
  totalRevenue: number;
  totalTasks: number;
  totalAssets: number;
  recentPayments: any[];
}

export default function PlatformAdmin() {
  const { language } = useLanguage();
  const l = (en: string, es: string, de: string) => (language === 'es' ? es : language === 'de' ? de : en);
  const [stats, setStats] = useState<PlatformStats>({
    totalOrgs: 0, totalUsers: 0, totalEstates: 0,
    activeSubscriptions: 0, totalRevenue: 0, totalTasks: 0,
    totalAssets: 0, recentPayments: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [orgsRes, profilesRes, estatesRes, subsRes] = await Promise.all([
          supabase.from('organizations').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('estates').select('id', { count: 'exact', head: true }),
          supabase.from('subscriptions').select('*').eq('status', 'active'),
        ]);

        const activeSubs = subsRes.data || [];
        const totalRevenue = activeSubs.reduce((sum, s) => sum + Number(s.amount), 0);

        setStats({
          totalOrgs: orgsRes.count || 0,
          totalUsers: profilesRes.count || 0,
          totalEstates: estatesRes.count || 0,
          activeSubscriptions: activeSubs.length,
          totalRevenue,
          totalTasks: 0,
          totalAssets: 0,
          recentPayments: activeSubs.slice(0, 5),
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    {
      title: l('Organizations', 'Organizaciones', 'Organisationen'),
      value: stats.totalOrgs,
      icon: Building2,
      tooltip: l('Total registered organizations', 'Total de organizaciones registradas', 'Registrierte Organisationen insgesamt'),
      color: 'text-primary',
    },
    {
      title: l('Users', 'Usuarios', 'Benutzer'),
      value: stats.totalUsers,
      icon: Users,
      tooltip: l('Total platform users', 'Total de usuarios en la plataforma', 'Benutzer der Plattform insgesamt'),
      color: 'text-primary',
    },
    {
      title: l('Estates', 'Propiedades', 'Immobilien'),
      value: stats.totalEstates,
      icon: BarChart3,
      tooltip: l('Active estates', 'Propiedades activas', 'Aktive Immobilien'),
      color: 'text-primary',
    },
    {
      title: l('Active Subscriptions', 'Suscripciones Activas', 'Aktive Abonnements'),
      value: stats.activeSubscriptions,
      icon: CreditCard,
      tooltip: l('Organizations with an active subscription', 'Organizaciones con suscripción activa', 'Organisationen mit aktivem Abonnement'),
      color: 'text-primary',
    },
    {
      title: l('Total Revenue', 'Ingresos Totales', 'Gesamtumsatz'),
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      tooltip: l('Total subscription revenue', 'Ingresos totales de suscripciones', 'Gesamter Abonnementumsatz'),
      color: 'text-primary',
    },
    {
      title: l('System Status', 'Estado del Sistema', 'Systemstatus'),
      value: l('Operational', 'Operativo', 'Betriebsbereit'),
      icon: Activity,
      tooltip: l('All services running', 'Todos los servicios funcionando', 'Alle Dienste laufen'),
      color: 'text-primary',
    },
  ];

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {l('Platform Administration', 'Panel de Administración', 'Plattformverwaltung')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {l('Manage client organizations, subscriptions and the platform', 'Gestiona organizaciones cliente, suscripciones y la plataforma', 'Kundenorganisationen, Abonnements und Plattform verwalten')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <Tooltip key={stat.title}>
              <TooltipTrigger asChild>
                <Card className="hover:shadow-md transition-shadow cursor-default">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.title}</p>
                        <p className="text-2xl font-bold text-foreground mt-1">
                          {loading ? '...' : stat.value}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                {stat.tooltip}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Subscriptions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                {l('Recent Subscriptions', 'Suscripciones Recientes', 'Neueste Abonnements')}
              </CardTitle>
              <CardDescription>
                {l('Latest active subscriptions', 'Últimas suscripciones activas', 'Neueste aktive Abonnements')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">{l('Loading...', 'Cargando...', 'Wird geladen...')}</p>
              ) : stats.recentPayments.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {l('No subscriptions yet', 'Aún no hay suscripciones', 'Noch keine Abonnements')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentPayments.map((sub: any) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {sub.plan_type === 'monthly' ? l('Monthly', 'Mensual', 'Monatlich') : l('Annual', 'Anual', 'Jährlich')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-foreground">${sub.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                {l('System Health', 'Salud del Sistema', 'Systemzustand')}
              </CardTitle>
              <CardDescription>
                {l('Service status', 'Estado de los servicios', 'Dienststatus')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: l('Database', 'Base de datos', 'Datenbank'), status: 'operational' },
                  { name: l('Authentication', 'Autenticación', 'Authentifizierung'), status: 'operational' },
                  { name: l('Storage', 'Almacenamiento', 'Speicher'), status: 'operational' },
                  { name: 'Edge Functions', status: 'operational' },
                  { name: 'PayPal API', status: 'operational' },
                ].map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm font-medium text-foreground">{service.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs text-muted-foreground">
                        {l('Operational', 'Operativo', 'Betriebsbereit')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">
              {l('Quick Actions', 'Acciones Rápidas', 'Schnellaktionen')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Users, label: l('View Clients', 'Ver Clientes', 'Kunden ansehen'), path: '/platform/clients' },
                { icon: CreditCard, label: l('Manage Plans', 'Gestionar Planes', 'Pläne verwalten'), path: '/platform/subscriptions' },
                { icon: BarChart3, label: l('View Metrics', 'Ver Métricas', 'Metriken ansehen'), path: '/platform/metrics' },
                { icon: AlertTriangle, label: l('Alerts', 'Alertas', 'Warnungen'), path: '/platform/system' },
              ].map((action) => (
                <Tooltip key={action.label}>
                  <TooltipTrigger asChild>
                    <button
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all"
                      onClick={() => window.location.href = action.path}
                    >
                      <action.icon className="h-6 w-6 text-primary" />
                      <span className="text-xs font-medium text-foreground text-center">{action.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{action.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
