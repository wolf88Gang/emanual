import React, { useState } from 'react';
import { 
  Thermometer, 
  CloudRain, 
  Wind, 
  Sun,
  AlertTriangle,
  ChevronRight,
  Check,
  X,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WeatherAlert {
  id: string;
  type: 'freeze' | 'heavy_rain' | 'high_wind' | 'drought';
  message: string;
  message_es?: string;
  severity: 'warning' | 'critical';
  fired_at: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

interface WeatherAlertWidgetProps {
  alerts: WeatherAlert[];
  onAlertUpdate?: () => void;
  className?: string;
}

const alertConfig = {
  freeze: {
    icon: Thermometer,
    bgClass: 'bg-info/10',
    borderClass: 'border-l-info',
    iconClass: 'text-info',
    labelEn: 'Freeze Warning',
    labelEs: 'Alerta de Helada',
  },
  heavy_rain: {
    icon: CloudRain,
    bgClass: 'bg-[hsl(var(--estate-water)/0.1)]',
    borderClass: 'border-l-[hsl(var(--estate-water))]',
    iconClass: 'text-[hsl(var(--estate-water))]',
    labelEn: 'Heavy Rain',
    labelEs: 'Lluvia Fuerte',
  },
  high_wind: {
    icon: Wind,
    bgClass: 'bg-muted',
    borderClass: 'border-l-muted-foreground',
    iconClass: 'text-muted-foreground',
    labelEn: 'High Wind',
    labelEs: 'Viento Fuerte',
  },
  drought: {
    icon: Sun,
    bgClass: 'bg-warning/10',
    borderClass: 'border-l-warning',
    iconClass: 'text-warning',
    labelEn: 'Drought Alert',
    labelEs: 'Alerta de Sequía',
  },
};

export function WeatherAlertWidget({ alerts, onAlertUpdate, className }: WeatherAlertWidgetProps) {
  const { t, language } = useLanguage();
  const [updating, setUpdating] = useState<string | null>(null);
  
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');

  async function updateAlertStatus(alertId: string, status: 'acknowledged' | 'resolved') {
    setUpdating(alertId);
    try {
      const { error } = await supabase
        .from('weather_alerts')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;
      
      toast.success(
        status === 'acknowledged' 
          ? (language === 'es' ? 'Alerta reconocida' : 'Alert acknowledged')
          : (language === 'es' ? 'Alerta resuelta' : 'Alert resolved')
      );
      onAlertUpdate?.();
    } catch (error) {
      console.error('Error updating alert:', error);
      toast.error(language === 'es' ? 'Error al actualizar' : 'Failed to update');
    } finally {
      setUpdating(null);
    }
  }

  return (
    <Card className={cn('estate-card', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <Bell className="h-5 w-5 text-warning" />
            {t('dashboard.weatherWatch')}
          </CardTitle>
          {activeAlerts.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {activeAlerts.length} {language === 'es' ? 'activas' : 'active'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeAlerts.length === 0 && acknowledgedAlerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Sun className="h-10 w-10 mx-auto mb-2 text-[hsl(var(--estate-sage))]" />
            <p>{t('dashboard.noAlerts')}</p>
            <p className="text-sm mt-1">{t('weather.next48h')}</p>
          </div>
        ) : (
          <>
            {/* Active alerts - require action */}
            {activeAlerts.map((alert) => {
              const config = alertConfig[alert.type];
              const Icon = config.icon;
              const isUpdating = updating === alert.id;
              
              return (
                <div
                  key={alert.id}
                  className={cn(
                    'rounded-lg p-4 border-l-4',
                    config.bgClass,
                    config.borderClass
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', config.iconClass)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {language === 'es' ? config.labelEs : config.labelEn}
                        </p>
                        {alert.severity === 'critical' && (
                          <Badge variant="destructive" className="text-xs">
                            {language === 'es' ? 'Crítico' : 'Critical'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {language === 'es' && alert.message_es 
                          ? alert.message_es 
                          : alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(alert.fired_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={isUpdating}
                      onClick={() => updateAlertStatus(alert.id, 'acknowledged')}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {language === 'es' ? 'Reconocer' : 'Acknowledge'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      disabled={isUpdating}
                      onClick={() => updateAlertStatus(alert.id, 'resolved')}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {language === 'es' ? 'Resolver' : 'Resolve'}
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Acknowledged alerts - pending resolution */}
            {acknowledgedAlerts.length > 0 && (
              <>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
                  {language === 'es' ? 'Pendientes de Resolver' : 'Pending Resolution'}
                </div>
                {acknowledgedAlerts.slice(0, 2).map((alert) => {
                  const config = alertConfig[alert.type];
                  const Icon = config.icon;
                  const isUpdating = updating === alert.id;
                  
                  return (
                    <div
                      key={alert.id}
                      className="rounded-lg p-3 bg-secondary/50 border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn('h-4 w-4', config.iconClass)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">
                            {language === 'es' ? config.labelEs : config.labelEn}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isUpdating}
                          onClick={() => updateAlertStatus(alert.id, 'resolved')}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}