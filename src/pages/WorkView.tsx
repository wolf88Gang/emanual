import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  MapPin, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Navigation
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkAreasCard } from '@/components/work/WorkAreasCard';
import { NearbyWorkCard } from '@/components/work/NearbyWorkCard';
import { WeatherAlertWidget } from '@/components/dashboard/WeatherAlertWidget';
import { CheckinDialog } from '@/components/checkin/CheckinDialog';
import { useNearbyWork } from '@/hooks/useNearbyWork';
import { Building2 } from 'lucide-react';

interface WorkZone {
  id: string;
  name: string;
  color: string;
  pendingTasks: number;
  overdueTasks: number;
  geometry_geojson?: any;
}

interface UpcomingTask {
  id: string;
  title: string;
  title_es: string | null;
  due_date: string | null;
  status: string;
  zone?: { name: string; color: string };
  asset?: { name: string; asset_type: string };
}

interface RawAsset {
  id: string;
  name: string;
  asset_type: string;
  lat: number | null;
  lng: number | null;
  zone_id: string | null;
}

interface RawTask {
  id: string;
  zone_id: string | null;
  asset_id: string | null;
  status: string | null;
  due_date: string | null;
}

export default function WorkView() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const { currentEstate, loading: estateLoading } = useEstate();
  
  const [workZones, setWorkZones] = useState<WorkZone[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [rawAssets, setRawAssets] = useState<RawAsset[]>([]);
  const [rawTasks, setRawTasks] = useState<RawTask[]>([]);
  const [zonesWithGeometry, setZonesWithGeometry] = useState<any[]>([]);

  // GPS-based nearby work
  const { 
    nearbyAssets, 
    nearbyZones, 
    loading: geoLoading, 
    error: geoError, 
    hasLocation,
    refresh: refreshLocation 
  } = useNearbyWork({
    assets: rawAssets,
    zones: zonesWithGeometry,
    tasks: rawTasks,
    maxDistance: 150, // 150 meters
  });

  useEffect(() => {
    if (currentEstate) {
      fetchWorkData();
    }
  }, [currentEstate]);

  async function fetchWorkData() {
    if (!currentEstate) return;
    
    setLoading(true);
    try {
      // Fetch zones with task counts and geometry for GPS
      const { data: zonesData } = await supabase
        .from('zones')
        .select('id, name, color, geometry_geojson')
        .eq('estate_id', currentEstate.id)
        .order('name');

      // Fetch assets for GPS nearby work
      const { data: assetsData } = await supabase
        .from('assets')
        .select('id, name, asset_type, lat, lng, zone_id')
        .eq('estate_id', currentEstate.id);

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, zone_id, asset_id, status, due_date')
        .eq('estate_id', currentEstate.id)
        .neq('status', 'completed');

      const today = new Date().toISOString().split('T')[0];

      // Store raw data for GPS nearby work
      setRawAssets(assetsData || []);
      setRawTasks((tasksData || []).map(t => ({
        id: t.id,
        zone_id: t.zone_id,
        asset_id: t.asset_id,
        status: t.status,
        due_date: t.due_date,
      })));
      setZonesWithGeometry(zonesData || []);
      
      // Calculate task counts per zone
      const zoneTaskCounts = (zonesData || []).map(zone => {
        const zoneTasks = (tasksData || []).filter(t => t.zone_id === zone.id);
        const overdue = zoneTasks.filter(t => t.due_date && t.due_date < today).length;
        const pending = zoneTasks.length - overdue;
        
        return {
          id: zone.id,
          name: zone.name,
          color: zone.color || '#888888',
          pendingTasks: pending,
          overdueTasks: overdue,
          geometry_geojson: zone.geometry_geojson,
        };
      });

      setWorkZones(zoneTaskCounts);

      // Fetch upcoming tasks
      const { data: upcomingData } = await supabase
        .from('tasks')
        .select(`
          id, title, title_es, due_date, status,
          zones:zone_id (name, color),
          assets:asset_id (name, asset_type)
        `)
        .eq('estate_id', currentEstate.id)
        .neq('status', 'completed')
        .order('due_date', { ascending: true })
        .limit(5);

      setUpcomingTasks((upcomingData || []).map(t => ({
        id: t.id,
        title: t.title,
        title_es: t.title_es,
        due_date: t.due_date,
        status: t.status || 'pending',
        zone: t.zones as any,
        asset: t.assets as any,
      })));

      // Fetch alerts
      const { data: alertsData } = await supabase
        .from('weather_alerts')
        .select('*')
        .eq('estate_id', currentEstate.id)
        .in('status', ['active', 'acknowledged'])
        .order('fired_at', { ascending: false })
        .limit(5);

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

    } catch (error) {
      console.error('Error fetching work data:', error);
    } finally {
      setLoading(false);
    }
  }

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date(new Date().toDateString());
  };

  const getTaskTitle = (task: UpcomingTask) => {
    return language === 'es' && task.title_es ? task.title_es : task.title;
  };

  if (estateLoading) {
    return (
      <ModernAppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">
            {language === 'es' ? 'Cargando...' : 'Loading...'}
          </div>
        </div>
      </ModernAppLayout>
    );
  }

  if (!currentEstate) {
    return (
      <ModernAppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-serif font-semibold mb-2">
            {language === 'es' ? 'Sin Propiedad Seleccionada' : 'No Estate Selected'}
          </h2>
          <p className="text-muted-foreground max-w-md">
            {language === 'es' 
              ? 'No tienes acceso a ninguna propiedad. Contacta a tu administrador.'
              : 'You don\'t have access to any estates. Contact your administrator.'}
          </p>
        </div>
      </ModernAppLayout>
    );
  }

  return (
    <ModernAppLayout>
      <div className="container py-6 space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-sm">
              {currentEstate.name}
            </p>
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-foreground mt-1">
              {language === 'es' ? 'Bienvenido' : 'Welcome'}, {profile?.full_name?.split(' ')[0] || ''}
            </h1>
          </div>
          
          {/* Floating Check-in Button */}
          <Button 
            size="lg" 
            className="gap-2 shadow-lg"
            onClick={() => setCheckinDialogOpen(true)}
          >
            <Camera className="h-5 w-5" />
            {language === 'es' ? 'Nuevo Registro' : 'New Check-in'}
          </Button>
        </div>

        {/* Weather Alerts - Only show if there are active alerts */}
        {alerts.length > 0 && (
          <WeatherAlertWidget alerts={alerts} onAlertUpdate={fetchWorkData} />
        )}

        {/* GPS-Based Nearby Work */}
        <NearbyWorkCard
          nearbyAssets={nearbyAssets}
          nearbyZones={nearbyZones}
          loading={geoLoading}
          error={geoError}
          hasLocation={hasLocation}
          onRefresh={refreshLocation}
        />

        {/* Main Work Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Where to Work */}
          <WorkAreasCard zones={workZones} loading={loading} />

          {/* Upcoming Tasks */}
          <Card className="estate-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                {language === 'es' ? 'Próximas Tareas' : 'Upcoming Tasks'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                ))
              ) : upcomingTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success" />
                  <p className="font-medium">
                    {language === 'es' ? 'Sin tareas pendientes' : 'No pending tasks'}
                  </p>
                </div>
              ) : (
                upcomingTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => navigate('/tasks')}
                    className="w-full p-4 rounded-xl bg-secondary/50 hover:bg-secondary text-left transition-all flex items-center gap-3"
                  >
                    {/* Status indicator */}
                    <div className={`w-2 h-10 rounded-full shrink-0 ${
                      isOverdue(task.due_date) ? 'bg-destructive' : 
                      task.status === 'in_progress' ? 'bg-info' : 'bg-warning'
                    }`} />

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{getTaskTitle(task)}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {task.zone && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {task.zone.name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className={isOverdue(task.due_date) ? 'text-destructive' : ''}>
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {isOverdue(task.due_date) && (
                      <Badge variant="destructive" className="shrink-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {language === 'es' ? 'Vencida' : 'Overdue'}
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => navigate('/map')}
          >
            <MapPin className="h-6 w-6 text-primary" />
            <span>{t('nav.map')}</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => navigate('/assets')}
          >
            <Navigation className="h-6 w-6 text-primary" />
            <span>{t('nav.assets')}</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => navigate('/tasks')}
          >
            <Clock className="h-6 w-6 text-primary" />
            <span>{t('nav.tasks')}</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => setCheckinDialogOpen(true)}
          >
            <Camera className="h-6 w-6 text-primary" />
            <span>{language === 'es' ? 'Registro' : 'Check-in'}</span>
          </Button>
        </div>

        {/* Check-in Dialog */}
        <CheckinDialog 
          open={checkinDialogOpen} 
          onOpenChange={setCheckinDialogOpen}
          onSuccess={fetchWorkData}
        />
      </div>
    </ModernAppLayout>
  );
}
