import React from 'react';
import { 
  Thermometer, 
  CloudRain, 
  Wind, 
  Sun,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
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
}

interface WeatherAlertCardProps {
  alerts: WeatherAlert[];
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
    bgClass: 'bg-estate-water/10',
    borderClass: 'border-l-estate-water',
    iconClass: 'text-estate-water',
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

export function WeatherAlertCard({ alerts, className }: WeatherAlertCardProps) {
  const { t, language } = useLanguage();
  
  return (
    <Card className={cn('estate-card', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t('dashboard.weatherAlerts')}
          </CardTitle>
          {alerts.length > 0 && (
            <Badge variant="secondary" className="bg-warning/20 text-warning-foreground">
              {alerts.length} {t('dashboard.alertsActive')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Sun className="h-10 w-10 mx-auto mb-2 text-estate-sage" />
            <p>{t('dashboard.noAlerts')}</p>
            <p className="text-sm mt-1">{t('weather.next48h')}</p>
          </div>
        ) : (
          <>
            {alerts.slice(0, 3).map((alert) => {
              const config = alertConfig[alert.type];
              const Icon = config.icon;
              
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
                    <Icon className={cn('h-5 w-5 mt-0.5', config.iconClass)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {language === 'es' ? config.labelEs : config.labelEn}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {language === 'es' && alert.message_es 
                          ? alert.message_es 
                          : alert.message}
                      </p>
                    </div>
                    {alert.severity === 'critical' && (
                      <Badge variant="destructive" className="shrink-0">
                        Critical
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
            
            {alerts.length > 3 && (
              <Button variant="ghost" className="w-full" size="sm">
                +{alerts.length - 3} more alerts
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
