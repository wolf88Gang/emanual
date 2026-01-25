import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { WeatherAlertWidget } from '@/components/dashboard/WeatherAlertWidget';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { TasksOverviewCard } from '@/components/dashboard/TasksOverviewCard';
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard';
import { EstateStatsCard } from '@/components/dashboard/EstateStatsCard';
import { CheckinDialog } from '@/components/checkin/CheckinDialog';
import { Building2 } from 'lucide-react';

export default function Dashboard() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { currentEstate, loading: estateLoading } = useEstate();
  
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalZones: 0,
    totalDocuments: 0,
    totalTasks: 0,
    completedTasks: 0,
  });
  const [tasks, setTasks] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);

  useEffect(() => {
    if (currentEstate) {
      fetchDashboardData();
    }
  }, [currentEstate]);

  async function fetchDashboardData() {
    if (!currentEstate) return;
    
    setLoading(true);
    try {
      // Fetch stats
      const [assetsRes, zonesRes, docsRes, tasksRes] = await Promise.all([
        supabase.from('assets').select('id', { count: 'exact' }).eq('estate_id', currentEstate.id),
        supabase.from('zones').select('id', { count: 'exact' }).eq('estate_id', currentEstate.id),
        supabase.from('documents').select('id', { count: 'exact' }).eq('estate_id', currentEstate.id),
        supabase.from('tasks').select('id, status', { count: 'exact' }).eq('estate_id', currentEstate.id),
      ]);

      const completedCount = tasksRes.data?.filter(t => t.status === 'completed').length || 0;
      
      setStats({
        totalAssets: assetsRes.count || 0,
        totalZones: zonesRes.count || 0,
        totalDocuments: docsRes.count || 0,
        totalTasks: tasksRes.count || 0,
        completedTasks: completedCount,
      });

      // Fetch today's tasks
      const today = new Date().toISOString().split('T')[0];
      const { data: todayTasks } = await supabase
        .from('tasks')
        .select(`
          id, title, title_es, status, due_date, required_photo,
          assets:asset_id (id, name, asset_type),
          zones:zone_id (id, name)
        `)
        .eq('estate_id', currentEstate.id)
        .lte('due_date', today)
        .neq('status', 'completed')
        .order('due_date', { ascending: true })
        .limit(10);

      setTasks((todayTasks || []).map(task => ({
        ...task,
        asset: task.assets,
        zone: task.zones,
      })));

      // Fetch weather alerts (active and acknowledged)
      const { data: alertsData } = await supabase
        .from('weather_alerts')
        .select('*')
        .eq('estate_id', currentEstate.id)
        .in('status', ['active', 'acknowledged'])
        .order('fired_at', { ascending: false })
        .limit(10);

      setAlerts((alertsData || []).map(a => ({
        id: a.id,
        type: a.message?.toLowerCase().includes('freeze') ? 'freeze' 
          : a.message?.toLowerCase().includes('rain') ? 'heavy_rain'
          : a.message?.toLowerCase().includes('wind') ? 'high_wind'
          : 'drought',
        message: a.message,
        message_es: a.message_es,
        severity: a.severity === 'critical' ? 'critical' : 'warning',
        fired_at: a.fired_at,
        status: a.status as 'active' | 'acknowledged' | 'resolved',
      })));

      // Fetch recent checkins as activities
      const { data: checkinsData } = await supabase
        .from('checkins')
        .select(`
          id, checkin_at, notes, photo_url,
          profiles:user_id (full_name, avatar_url),
          zones:zone_id (name)
        `)
        .eq('estate_id', currentEstate.id)
        .order('checkin_at', { ascending: false })
        .limit(5);

      setActivities((checkinsData || []).map(c => ({
        id: c.id,
        type: 'checkin' as const,
        user: {
          name: (c.profiles as any)?.full_name || 'User',
          avatar_url: (c.profiles as any)?.avatar_url,
        },
        description: c.notes || 'Checked in',
        timestamp: c.checkin_at,
        zone: (c.zones as any)?.name,
        photo_url: c.photo_url,
      })));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (estateLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!currentEstate) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-serif font-semibold mb-2">No Estate Selected</h2>
          <p className="text-muted-foreground max-w-md">
            You don't have access to any estates yet. Contact your administrator 
            to get access to an estate.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-6 space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-foreground">
              {t('dashboard.welcome')}, {profile?.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {currentEstate.name} • {currentEstate.country || 'Estate'}
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <EstateStatsCard stats={stats} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Tasks & Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            <QuickActionsCard onCheckin={() => setCheckinDialogOpen(true)} />
            <TasksOverviewCard tasks={tasks} />
          </div>

          {/* Right Column - Weather & Activity */}
          <div className="space-y-6">
            <WeatherAlertWidget alerts={alerts} onAlertUpdate={fetchDashboardData} />
            <RecentActivityCard activities={activities} />
          </div>
        </div>
        
        {/* Check-in Dialog */}
        <CheckinDialog 
          open={checkinDialogOpen} 
          onOpenChange={setCheckinDialogOpen}
          onSuccess={fetchDashboardData}
        />
      </div>
    </AppLayout>
  );
}
