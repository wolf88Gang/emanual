import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, AlertTriangle, Clock, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WorkArea {
  id: string;
  name: string;
  color: string;
  pendingTasks: number;
  overdueTasks: number;
  lastActivity?: string;
  purposeTags?: string[];
}

interface WorkAreasCardProps {
  zones: WorkArea[];
  loading?: boolean;
}

export function WorkAreasCard({ zones, loading }: WorkAreasCardProps) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const getUrgencyLevel = (zone: WorkArea): 'critical' | 'attention' | 'ok' => {
    if (zone.overdueTasks > 0) return 'critical';
    if (zone.pendingTasks > 0) return 'attention';
    return 'ok';
  };

  const urgencyConfig = {
    critical: {
      bg: 'bg-destructive/10',
      border: 'border-destructive/30',
      dot: 'bg-destructive animate-pulse',
      text: language === 'es' ? 'Atención urgente' : 'Urgent attention',
    },
    attention: {
      bg: 'bg-warning/10',
      border: 'border-warning/30',
      dot: 'bg-warning',
      text: language === 'es' ? 'Tareas pendientes' : 'Tasks pending',
    },
    ok: {
      bg: 'bg-success/10',
      border: 'border-success/30',
      dot: 'bg-success',
      text: language === 'es' ? 'Al día' : 'Up to date',
    },
  };

  // Sort by urgency: critical first, then attention, then ok
  const sortedZones = [...zones].sort((a, b) => {
    const order = { critical: 0, attention: 1, ok: 2 };
    return order[getUrgencyLevel(a)] - order[getUrgencyLevel(b)];
  });

  const attentionNeeded = zones.filter(z => getUrgencyLevel(z) !== 'ok');

  if (loading) {
    return (
      <Card className="estate-card">
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="estate-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {language === 'es' ? '¿Dónde trabajar?' : 'Where to work?'}
          </CardTitle>
          {attentionNeeded.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {attentionNeeded.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedZones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success" />
            <p className="font-medium">
              {language === 'es' ? 'Todo al día' : 'All caught up'}
            </p>
            <p className="text-sm mt-1">
              {language === 'es' ? 'No hay trabajo pendiente' : 'No pending work'}
            </p>
          </div>
        ) : (
          sortedZones.slice(0, 5).map((zone) => {
            const urgency = getUrgencyLevel(zone);
            const config = urgencyConfig[urgency];

            return (
              <button
                key={zone.id}
                onClick={() => navigate(`/tasks?zone=${zone.id}`)}
                className={cn(
                  'w-full p-4 rounded-xl text-left transition-all',
                  'border hover:shadow-md active:scale-[0.99]',
                  config.bg,
                  config.border
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Zone color indicator */}
                  <div 
                    className="w-3 h-12 rounded-full shrink-0 mt-0.5"
                    style={{ backgroundColor: zone.color }}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{zone.name}</h4>
                      <div className={cn('w-2 h-2 rounded-full shrink-0', config.dot)} />
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {config.text}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-xs">
                      {zone.overdueTasks > 0 && (
                        <span className="text-destructive font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {zone.overdueTasks} {language === 'es' ? 'vencidas' : 'overdue'}
                        </span>
                      )}
                      {zone.pendingTasks > 0 && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {zone.pendingTasks} {language === 'es' ? 'pendientes' : 'pending'}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                </div>
              </button>
            );
          })
        )}

        {zones.length > 5 && (
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => navigate('/map')}
          >
            {language === 'es' ? 'Ver todas las zonas' : 'View all zones'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
