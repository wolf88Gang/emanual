import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Camera,
  Calendar,
  Filter,
  Plus,
  ChevronRight,
  User,
  Building
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetTypeIcon } from '@/components/icons/AssetTypeIcon';
import { TaskCompletionDialog } from '@/components/tasks/TaskCompletionDialog';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  title_es: string | null;
  description: string | null;
  description_es: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  due_date: string;
  frequency: string;
  required_photo: boolean;
  priority: number;
  asset?: {
    id: string;
    name: string;
    asset_type: string;
  };
  zone?: {
    id: string;
    name: string;
    color: string;
  };
  assigned_user?: {
    id: string;
    full_name: string;
  };
}

const statusConfig = {
  pending: {
    label: 'Pending',
    labelEs: 'Pendiente',
    dotClass: 'status-pending',
    badgeClass: 'bg-warning/20 text-warning-foreground border-warning/30',
  },
  in_progress: {
    label: 'In Progress',
    labelEs: 'En Progreso',
    dotClass: 'status-in-progress',
    badgeClass: 'bg-info/20 text-info-foreground border-info/30',
  },
  completed: {
    label: 'Completed',
    labelEs: 'Completado',
    dotClass: 'status-completed',
    badgeClass: 'bg-success/20 text-success-foreground border-success/30',
  },
  overdue: {
    label: 'Overdue',
    labelEs: 'Atrasado',
    dotClass: 'status-overdue',
    badgeClass: 'bg-destructive/20 text-destructive border-destructive/30',
  },
};

export default function Tasks() {
  const { t, language } = useLanguage();
  const { currentEstate } = useEstate();
  const { isOwnerOrManager, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);

  // Handle zone filter from URL
  useEffect(() => {
    const zoneId = searchParams.get('zone');
    if (zoneId) {
      setZoneFilter(zoneId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentEstate) {
      fetchTasks();
    }
  }, [currentEstate]);

  async function fetchTasks() {
    if (!currentEstate) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assets:asset_id (id, name, asset_type),
          zones:zone_id (id, name, color),
          profiles:assigned_to_user_id (id, full_name)
        `)
        .eq('estate_id', currentEstate.id)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Process tasks to add overdue status
      const processedTasks = (data || []).map(task => {
        let status = task.status as Task['status'];
        if (status !== 'completed' && task.due_date && isPast(parseISO(task.due_date))) {
          status = 'overdue';
        }
        return {
          ...task,
          status,
          asset: task.assets as Task['asset'],
          zone: task.zones as Task['zone'],
          assigned_user: task.profiles as Task['assigned_user'],
        };
      });

      setTasks(processedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTasks = tasks.filter(task => {
    // Apply zone filter if set
    if (zoneFilter && task.zone?.id !== zoneFilter) return false;
    
    switch (activeTab) {
      case 'today':
        return task.due_date && isToday(parseISO(task.due_date)) && task.status !== 'completed';
      case 'overdue':
        return task.status === 'overdue';
      case 'completed':
        return task.status === 'completed';
      case 'my':
        return task.assigned_user?.id === user?.id && task.status !== 'completed';
      default:
        return task.status !== 'completed';
    }
  });

  // Get zone name for filter display
  const filterZone = zoneFilter ? tasks.find(t => t.zone?.id === zoneFilter)?.zone : null;

  const taskCounts = {
    all: tasks.filter(t => t.status !== 'completed').length,
    today: tasks.filter(t => t.due_date && isToday(parseISO(t.due_date)) && t.status !== 'completed').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    my: tasks.filter(t => t.assigned_user?.id === user?.id && t.status !== 'completed').length,
  };

  function openCompletionDialog(task: Task) {
    setSelectedTask(task);
    setCompletionDialogOpen(true);
  }

  return (
    <ModernAppLayout>
      <div className="container py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold">{t('tasks.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {language === 'es' ? 'Gestiona tareas de mantenimiento y cuidado' : 'Manage maintenance and care tasks'}
            </p>
          </div>
          {isOwnerOrManager && (
            <Button onClick={() => {
              toast.info(language === 'es' ? 'Función en desarrollo' : 'Feature coming soon');
            }}>
              <Plus className="h-4 w-4 mr-2" />
              {t('tasks.newTask')}
            </Button>
          )}
        </div>

        {/* Zone Filter Banner */}
        {filterZone && (
          <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: filterZone.color }}
              />
              <span className="font-medium">
                {language === 'es' ? 'Tareas de' : 'Tasks in'}: {filterZone.name}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setZoneFilter(null)}
            >
              {language === 'es' ? 'Ver todas' : 'Show all'}
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full sm:w-auto flex-wrap h-auto p-1">
            <TabsTrigger value="all" className="gap-2">
              {language === 'es' ? 'Todo' : 'All'}
              <Badge variant="secondary" className="h-5 px-1.5">{taskCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="today" className="gap-2">
              {language === 'es' ? 'Hoy' : 'Today'}
              <Badge variant="secondary" className="h-5 px-1.5">{taskCounts.today}</Badge>
            </TabsTrigger>
            <TabsTrigger value="overdue" className="gap-2">
              {language === 'es' ? 'Vencidas' : 'Overdue'}
              {taskCounts.overdue > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5">{taskCounts.overdue}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="my" className="gap-2">
              {language === 'es' ? 'Mis Tareas' : 'My Tasks'}
              <Badge variant="secondary" className="h-5 px-1.5">{taskCounts.my}</Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              {language === 'es' ? 'Hechas' : 'Done'}
              <Badge variant="secondary" className="h-5 px-1.5">{taskCounts.completed}</Badge>
            </TabsTrigger>
          </TabsList>

          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 rounded-xl shimmer" />
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <Card className="estate-card">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
                  <h3 className="font-medium text-lg">
                    {language === 'es' ? '¡Todo al día!' : 'All caught up!'}
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    {activeTab === 'overdue' 
                      ? (language === 'es' ? 'Sin tareas vencidas' : 'No overdue tasks')
                      : (language === 'es' ? 'Sin tareas en esta categoría' : 'No tasks in this category')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredTasks.map((task) => {
                const config = statusConfig[task.status];
                
                return (
                  <Card 
                    key={task.id} 
                    className="estate-card cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
                      if (task.status !== 'completed') {
                        openCompletionDialog(task);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Status indicator */}
                        <div className={cn('status-dot mt-2 shrink-0', config.dotClass)} />

                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-medium">
                                {language === 'es' && task.title_es 
                                  ? task.title_es 
                                  : task.title}
                              </h3>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                                  {language === 'es' && task.description_es 
                                    ? task.description_es 
                                    : task.description}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className={cn('shrink-0', config.badgeClass)}>
                              {language === 'es' ? config.labelEs : config.label}
                            </Badge>
                          </div>

                          {/* Meta info */}
                          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {format(parseISO(task.due_date), 'MMM d')}
                              </span>
                            )}
                            {task.zone && (
                              <span className="flex items-center gap-1">
                                <div 
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: task.zone.color }}
                                />
                                {task.zone.name}
                              </span>
                            )}
                            {task.asset && (
                              <span className="flex items-center gap-1">
                                <AssetTypeIcon type={task.asset.asset_type as any} size="sm" />
                                {task.asset.name}
                              </span>
                            )}
                            {task.required_photo && (
                              <span className="flex items-center gap-1 text-primary">
                                <Camera className="h-3.5 w-3.5" />
                                {language === 'es' ? 'Foto requerida' : 'Photo required'}
                              </span>
                            )}
                          </div>

                          {/* Assigned user */}
                          {task.assigned_user && (
                            <div className="flex items-center gap-2 mt-2">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{task.assigned_user.full_name}</span>
                            </div>
                          )}
                        </div>

                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </Tabs>

        {/* Task Completion Dialog */}
        <TaskCompletionDialog
          open={completionDialogOpen}
          onOpenChange={setCompletionDialogOpen}
          task={selectedTask}
          onSuccess={fetchTasks}
        />
      </div>
    </ModernAppLayout>
  );
}
