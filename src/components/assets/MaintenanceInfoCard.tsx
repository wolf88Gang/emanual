import React from 'react';
import { 
  BookOpen, 
  FileText, 
  MessageSquare, 
  Calendar,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface MaintenanceTask {
  id: string;
  title: string;
  description: string | null;
  frequency: string | null;
  status: string | null;
  due_date: string | null;
  priority: number | null;
}

interface TaskCompletion {
  id: string;
  task_title: string;
  completed_at: string;
  notes: string | null;
  completed_by: string;
  amendment_note?: string | null;
}

interface RelatedDocument {
  id: string;
  title: string;
  category: string;
  expiry_date: string | null;
  file_url: string;
  notes: string | null;
}

interface MaintenanceInfoCardProps {
  assetName: string;
  assetType: string;
  criticalCareNote: string | null;
  doNotDoWarnings: string | null;
  lastServiceDate: string | null;
  installDate: string | null;
  tasks: MaintenanceTask[];
  recentCompletions: TaskCompletion[];
  documents: RelatedDocument[];
}

export function MaintenanceInfoCard({
  assetName,
  assetType,
  criticalCareNote,
  doNotDoWarnings,
  lastServiceDate,
  installDate,
  tasks,
  recentCompletions,
  documents,
}: MaintenanceInfoCardProps) {
  const { language } = useLanguage();
  const locale = language === 'es' ? es : enUS;

  const scheduledTasks = tasks.filter(t => t.status !== 'completed');
  const manuals = documents.filter(d => 
    d.category === 'warranty' || 
    d.category === 'asbuilt' || 
    d.category === 'other'
  );
  const contracts = documents.filter(d => 
    d.category === 'vendor_contract' || 
    d.category === 'insurance'
  );

  const frequencyLabel = (freq: string | null) => {
    if (!freq) return language === 'es' ? 'Una vez' : 'Once';
    const labels: Record<string, { es: string; en: string }> = {
      once: { es: 'Una vez', en: 'Once' },
      weekly: { es: 'Semanal', en: 'Weekly' },
      monthly: { es: 'Mensual', en: 'Monthly' },
      quarterly: { es: 'Trimestral', en: 'Quarterly' },
      annual: { es: 'Anual', en: 'Annual' },
      seasonal: { es: 'Estacional', en: 'Seasonal' },
    };
    return labels[freq]?.[language] || freq;
  };

  const priorityBadge = (priority: number | null) => {
    if (!priority) return null;
    if (priority === 1) return <Badge variant="destructive" className="text-xs">Alta</Badge>;
    if (priority === 2) return <Badge variant="secondary" className="text-xs">Normal</Badge>;
    return <Badge variant="outline" className="text-xs">Baja</Badge>;
  };

  return (
    <Card className="estate-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          {language === 'es' ? 'Información de Mantenimiento' : 'Maintenance Information'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {language === 'es' 
            ? 'Esta información alimenta el Manual Integral de la propiedad'
            : 'This information feeds the Property Integral Manual'}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Service Timeline */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">
                {language === 'es' ? 'Fecha de Instalación' : 'Installation Date'}
              </p>
              <p className="text-sm text-muted-foreground">
                {installDate 
                  ? format(new Date(installDate), 'PPP', { locale })
                  : (language === 'es' ? 'No registrada' : 'Not recorded')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
            <Wrench className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">
                {language === 'es' ? 'Último Servicio' : 'Last Service'}
              </p>
              <p className="text-sm text-muted-foreground">
                {lastServiceDate 
                  ? `${format(new Date(lastServiceDate), 'PPP', { locale })} (${formatDistanceToNow(new Date(lastServiceDate), { locale, addSuffix: true })})`
                  : (language === 'es' ? 'No registrado' : 'Not recorded')}
              </p>
            </div>
          </div>
        </div>

        {/* Critical Instructions */}
        {(criticalCareNote || doNotDoWarnings) && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {language === 'es' ? 'Instrucciones Críticas' : 'Critical Instructions'}
              </h4>
              
              {criticalCareNote && (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="text-sm font-medium text-primary mb-1">
                    {language === 'es' ? 'Cuidados Críticos:' : 'Critical Care:'}
                  </p>
                  <p className="text-sm">{criticalCareNote}</p>
                </div>
              )}
              
              {doNotDoWarnings && (
                <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                  <p className="text-sm font-medium text-destructive mb-1">
                    {language === 'es' ? '⛔ NO HACER:' : '⛔ DO NOT:'}
                  </p>
                  <p className="text-sm text-destructive">{doNotDoWarnings}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Scheduled Maintenance Tasks */}
        <Separator />
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {language === 'es' ? 'Tareas de Mantenimiento Programadas' : 'Scheduled Maintenance Tasks'}
            <Badge variant="secondary" className="ml-auto">{scheduledTasks.length}</Badge>
          </h4>
          
          {scheduledTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground italic p-3 bg-secondary/30 rounded-lg">
              {language === 'es' 
                ? 'No hay tareas programadas para este activo'
                : 'No scheduled tasks for this asset'}
            </p>
          ) : (
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {scheduledTasks.map(task => (
                  <div key={task.id} className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                        )}
                      </div>
                      {priorityBadge(task.priority)}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {frequencyLabel(task.frequency)}
                      </span>
                      {task.due_date && (
                        <span>
                          {language === 'es' ? 'Vence:' : 'Due:'} {format(new Date(task.due_date), 'PP', { locale })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Recent Interventions (Comments/Notes) */}
        <Separator />
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            {language === 'es' ? 'Notas e Intervenciones Recientes' : 'Recent Notes & Interventions'}
            <Badge variant="secondary" className="ml-auto">{recentCompletions.length}</Badge>
          </h4>
          
          {recentCompletions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic p-3 bg-secondary/30 rounded-lg">
              {language === 'es' 
                ? 'No hay intervenciones registradas'
                : 'No interventions recorded'}
            </p>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {recentCompletions.map(completion => (
                  <div key={completion.id} className="p-3 rounded-lg bg-secondary/30 border-l-2 border-primary">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium">{completion.task_title}</span>
                    </div>
                    {completion.notes && (
                      <p className="text-sm text-muted-foreground pl-5 mb-2">
                        "{completion.notes}"
                      </p>
                    )}
                    {completion.amendment_note && (
                      <p className="text-xs text-amber-600 pl-5 mb-2 italic">
                        📝 {completion.amendment_note}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pl-5">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {completion.completed_by}
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(completion.completed_at), { locale, addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Related Documentation */}
        {documents.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {language === 'es' ? 'Documentación Técnica' : 'Technical Documentation'}
              </h4>
              
              {manuals.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {language === 'es' ? 'Manuales y Planos' : 'Manuals & Plans'}
                  </p>
                  {manuals.map(doc => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
                    >
                      <FileText className="h-4 w-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {doc.title}
                        </p>
                        {doc.notes && (
                          <p className="text-xs text-muted-foreground truncate">{doc.notes}</p>
                        )}
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              )}

              {contracts.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {language === 'es' ? 'Contratos y Garantías' : 'Contracts & Warranties'}
                  </p>
                  {contracts.map(doc => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
                    >
                      <FileText className="h-4 w-4 text-amber-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {doc.title}
                        </p>
                        {doc.expiry_date && (
                          <p className="text-xs text-muted-foreground">
                            {language === 'es' ? 'Expira:' : 'Expires:'} {format(new Date(doc.expiry_date), 'PP', { locale })}
                          </p>
                        )}
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Manual Info Notice */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs text-primary flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {language === 'es' 
              ? 'Esta información se incluye automáticamente en el Manual Integral de la propiedad.'
              : 'This information is automatically included in the Property Integral Manual.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
