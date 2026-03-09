import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, CreditCard, BarChart3, AlertTriangle, Search, Mail, Phone, Calendar, Building2, DollarSign } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface ClientData {
  id: string;
  name: string;
  org_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  preferred_language: string;
  created_at: string;
  subscription?: {
    status: string;
    plan_type: string;
    amount: number;
    created_at: string;
    current_period_end: string;
  } | null;
  org?: {
    name: string;
    org_type: string;
  } | null;
  estates_count: number;
}

export default function PlatformClients() {
  const { language } = useLanguage();
  const es = language === 'es';
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalClients: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    newThisMonth: 0
  });

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      setLoading(true);
      
      // Fetch profiles with organization and subscription data
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          preferred_language,
          created_at,
          org_id,
          organizations!inner (
            name,
            org_type
          )
        `);

      if (error) throw error;

      // Fetch subscriptions
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*');

      // Fetch estates count for each org
      const { data: estates } = await supabase
        .from('estates')
        .select('org_id');

      // Process data
      const clientsData: ClientData[] = profiles?.map(profile => {
        const subscription = subscriptions?.find(s => s.user_id === profile.id);
        const estatesCount = estates?.filter(e => e.org_id === profile.org_id).length || 0;

        return {
          ...profile,
          name: profile.full_name || profile.email.split('@')[0],
          org: profile.organizations,
          subscription,
          estates_count: estatesCount
        };
      }) || [];

      setClients(clientsData);

      // Calculate stats
      const totalClients = clientsData.length;
      const activeSubscriptions = clientsData.filter(c => c.subscription?.status === 'active').length;
      const totalRevenue = clientsData.reduce((sum, c) => 
        sum + (c.subscription?.status === 'active' ? (c.subscription.amount || 0) : 0), 0
      );
      const newThisMonth = clientsData.filter(c => {
        const created = new Date(c.created_at);
        const now = new Date();
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length;

      setStats({ totalClients, activeSubscriptions, totalRevenue, newThisMonth });
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.org?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const quickActions = [
    { icon: Users, label: es ? 'Ver Clientes' : 'View Clients', count: stats.totalClients },
    { icon: CreditCard, label: es ? 'Gestionar Planes' : 'Manage Plans', count: stats.activeSubscriptions },
    { icon: BarChart3, label: es ? 'Ver Métricas' : 'View Metrics', count: `$${stats.totalRevenue.toFixed(0)}` },
    { icon: AlertTriangle, label: es ? 'Alertas' : 'Alerts', count: stats.newThisMonth },
  ];

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            {es ? 'Gestión de Clientes' : 'Client Management'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {es ? 'Administra todos los clientes de la plataforma' : 'Manage all platform clients'}
          </p>
        </div>

        {/* Quick Actions - At Top */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif">
              {es ? 'Acciones Rápidas' : 'Quick Actions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action, index) => (
                <Tooltip key={action.label}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all cursor-pointer">
                      <action.icon className="h-6 w-6 text-primary" />
                      <span className="text-xs font-medium text-foreground text-center">{action.label}</span>
                      <span className="text-sm font-bold text-primary">{action.count}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{action.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={es ? 'Buscar clientes...' : 'Search clients...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {es ? 'Todos los Clientes' : 'All Clients'}
            </CardTitle>
            <CardDescription>
              {es ? `${filteredClients.length} clientes encontrados` : `${filteredClients.length} clients found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">{es ? 'Cargando clientes...' : 'Loading clients...'}</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm 
                    ? (es ? 'No se encontraron clientes' : 'No clients found')
                    : (es ? 'Aún no hay clientes' : 'No clients yet')
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClients.map((client) => (
                  <Card key={client.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        {/* Client Info */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              {client.avatar_url ? (
                                <img src={client.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <span className="text-sm font-medium text-primary">
                                  {client.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{client.name}</h3>
                              <p className="text-sm text-muted-foreground">{client.org?.name || 'Sin organización'}</p>
                            </div>
                          </div>

                          {/* Contact Info */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">{client.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-foreground capitalize">
                                {client.org?.org_type?.replace('_', ' ') || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">
                                {es ? 'Registrado: ' : 'Joined: '}
                                {format(new Date(client.created_at), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </div>

                          {/* Subscription Info */}
                          {client.subscription && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">
                                  ${client.subscription.amount}/
                                  {client.subscription.plan_type === 'monthly' ? (es ? 'mes' : 'mo') : (es ? 'año' : 'yr')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">
                                  {es ? 'Suscrito: ' : 'Subscribed: '}
                                  {format(new Date(client.subscription.created_at), 'MMM dd, yyyy')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-foreground">
                                  {es ? 'Propiedades: ' : 'Estates: '}{client.estates_count}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Status & Actions */}
                        <div className="flex flex-col items-end gap-2">
                          <Badge 
                            variant={client.subscription?.status === 'active' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {client.subscription?.status === 'active' 
                              ? (es ? 'Activo' : 'Active')
                              : (es ? 'Inactivo' : 'Inactive')
                            }
                          </Badge>
                          
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => window.open(`mailto:${client.email}`)}
                                >
                                  <Mail className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {es ? 'Enviar email' : 'Send email'}
                              </TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <BarChart3 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {es ? 'Ver métricas' : 'View metrics'}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}