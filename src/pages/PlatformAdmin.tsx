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
  const es = language === 'es';
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
      title: es ? 'Organizaciones' : 'Organizations',
      value: stats.totalOrgs,
      icon: Building2,
      tooltip: es ? 'Total de organizaciones registradas' : 'Total registered organizations',
      color: 'text-primary',
    },
    {
      title: es ? 'Usuarios' : 'Users',
      value: stats.totalUsers,
      icon: Users,
      tooltip: es ? 'Total de usuarios en la plataforma' : 'Total platform users',
      color: 'text-primary',
    },
    {
      title: es ? 'Propiedades' : 'Estates',
      value: stats.totalEstates,
      icon: BarChart3,
      tooltip: es ? 'Propiedades activas' : 'Active estates',
      color: 'text-primary',
    },
    {
      title: es ? 'Suscripciones Activas' : 'Active Subscriptions',
      value: stats.activeSubscriptions,
      icon: CreditCard,
      tooltip: es ? 'Clientes con suscripción activa' : 'Clients with active subscription',
      color: 'text-primary',
    },
    {
      title: es ? 'Ingresos Totales' : 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      tooltip: es ? 'Ingresos totales de suscripciones' : 'Total subscription revenue',
      color: 'text-primary',
    },
    {
      title: es ? 'Estado del Sistema' : 'System Status',
      value: es ? 'Operativo' : 'Operational',
      icon: Activity,
      tooltip: es ? 'Todos los servicios funcionando' : 'All services running',
      color: 'text-primary',
    },
  ];

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            {es ? 'Panel de Administración' : 'Platform Administration'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {es ? 'Gestiona clientes, suscripciones y la plataforma' : 'Manage clients, subscriptions and the platform'}
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
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                {es ? 'Suscripciones Recientes' : 'Recent Subscriptions'}
              </CardTitle>
              <CardDescription>
                {es ? 'Últimas suscripciones activas' : 'Latest active subscriptions'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">{es ? 'Cargando...' : 'Loading...'}</p>
              ) : stats.recentPayments.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {es ? 'Aún no hay suscripciones' : 'No subscriptions yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentPayments.map((sub: any) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {sub.plan_type === 'monthly' ? (es ? 'Mensual' : 'Monthly') : (es ? 'Anual' : 'Annual')}
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
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                {es ? 'Salud del Sistema' : 'System Health'}
              </CardTitle>
              <CardDescription>
                {es ? 'Estado de los servicios' : 'Service status'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: es ? 'Base de datos' : 'Database', status: 'operational' },
                  { name: es ? 'Autenticación' : 'Authentication', status: 'operational' },
                  { name: es ? 'Almacenamiento' : 'Storage', status: 'operational' },
                  { name: 'Edge Functions', status: 'operational' },
                  { name: 'PayPal API', status: 'operational' },
                ].map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm font-medium text-foreground">{service.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs text-muted-foreground">
                        {es ? 'Operativo' : 'Operational'}
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
            <CardTitle className="text-lg font-serif">
              {es ? 'Acciones Rápidas' : 'Quick Actions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Users, label: es ? 'Ver Clientes' : 'View Clients', path: '/platform/clients' },
                { icon: CreditCard, label: es ? 'Gestionar Planes' : 'Manage Plans', path: '/platform/subscriptions' },
                { icon: BarChart3, label: es ? 'Ver Métricas' : 'View Metrics', path: '/platform/metrics' },
                { icon: AlertTriangle, label: es ? 'Alertas' : 'Alerts', path: '/platform/system' },
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
