import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, Clock, AlertCircle, Camera, Calendar as CalendarIcon, Plus, ChevronRight, User,
  Sparkles, RefreshCcw, Repeat
} from 'lucide-react';
import { TaskCalendar } from '@/components/tasks/TaskCalendar';
import { cn } from '@/lib/utils';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AssetTypeIcon } from '@/components/icons/AssetTypeIcon';
import { TaskCompletionDialog } from '@/components/tasks/TaskCompletionDialog';
import { Switch } from '@/components/ui/switch';
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
  asset?: { id: string; name: string; asset_type: string };
  zone?: { id: string; name: string; color: string };
  assigned_user?: { id: string; full_name: string };
}

interface TaskTemplate {
  id: string;
  title: string;
  title_es: string | null;
  description: string | null;
  frequency: string;
  priority: number;
  asset_type: string | null;
  is_ai_generated: boolean;
  enabled: boolean;
}

const statusConfig = {
  pending: { label: 'Pending', labelEs: 'Pendiente', dotClass: 'status-pending', badgeClass: 'bg-warning/20 text-warning-foreground border-warning/30' },
  in_progress: { label: 'In Progress', labelEs: 'En Progreso', dotClass: 'status-in-progress', badgeClass: 'bg-info/20 text-info-foreground border-info/30' },
  completed: { label: 'Completed', labelEs: 'Completado', dotClass: 'status-completed', badgeClass: 'bg-success/20 text-success-foreground border-success/30' },
  overdue: { label: 'Overdue', labelEs: 'Atrasado', dotClass: 'status-overdue', badgeClass: 'bg-destructive/20 text-destructive border-destructive/30' },
};

const FREQUENCY_OPTIONS = [
  { value: 'once', label: 'Once', labelEs: 'Una vez' },
  { value: 'weekly', label: 'Weekly', labelEs: 'Semanal' },
  { value: 'monthly', label: 'Monthly', labelEs: 'Mensual' },
  { value: 'quarterly', label: 'Quarterly', labelEs: 'Trimestral' },
  { value: 'annual', label: 'Annual', labelEs: 'Anual' },
  { value: 'seasonal', label: 'Seasonal', labelEs: 'Estacional' },
];

export default function Tasks() {
  const { t, language } = useLanguage();
  const { currentEstate } = useEstate();
  const { isOwnerOrManager, user } = useAuth();
  const [searchParams] = useSearchParams();
  const es = language === 'es';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);

  // New task dialog
  const [showNewTask, setShowNewTask] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAISuggest, setShowAISuggest] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [taskForm, setTaskForm] = useState({
    title: '', title_es: '', description: '', description_es: '',
    frequency: 'once', priority: 2, due_date: new Date().toISOString().split('T')[0],
    asset_id: '', zone_id: '',
  });

  useEffect(() => {
    const zoneId = searchParams.get('zone');
    if (zoneId) setZoneFilter(zoneId);
  }, [searchParams]);

  useEffect(() => {
    if (currentEstate) { fetchTasks(); fetchTemplates(); }
  }, [currentEstate]);

  async function fetchTasks() {
    if (!currentEstate) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assets:asset_id(id, name, asset_type), zones:zone_id(id, name, color), profiles:assigned_to_user_id(id, full_name)')
        .eq('estate_id', currentEstate.id)
        .order('due_date', { ascending: true });
      if (error) throw error;

      const processedTasks = (data || []).map(task => {
        let status = task.status as Task['status'];
        if (status !== 'completed' && task.due_date && isPast(parseISO(task.due_date))) status = 'overdue';
        return { ...task, status, asset: task.assets as Task['asset'], zone: task.zones as Task['zone'], assigned_user: task.profiles as Task['assigned_user'] };
      });
      setTasks(processedTasks);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  }

  async function fetchTemplates() {
    if (!currentEstate) return;
    const { data } = await supabase.from('task_templates').select('*').eq('estate_id', currentEstate.id).order('title');
    setTemplates((data || []) as TaskTemplate[]);
  }

  async function handleCreateTask() {
    if (!taskForm.title.trim() || !currentEstate) {
      toast.error(es ? 'El título es requerido' : 'Title is required');
      return;
    }
    try {
      const { error } = await supabase.from('tasks').insert({
        estate_id: currentEstate.id,
        title: taskForm.title,
        title_es: taskForm.title_es || taskForm.title,
        description: taskForm.description || null,
        description_es: taskForm.description_es || null,
        frequency: taskForm.frequency as any,
        priority: taskForm.priority,
        due_date: taskForm.due_date,
        asset_id: taskForm.asset_id || null,
        zone_id: taskForm.zone_id || null,
        status: 'pending',
      });
      if (error) throw error;
      toast.success(es ? 'Tarea creada' : 'Task created');
      setShowNewTask(false);
      setTaskForm({ title: '', title_es: '', description: '', description_es: '', frequency: 'once', priority: 2, due_date: new Date().toISOString().split('T')[0], asset_id: '', zone_id: '' });
      fetchTasks();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleAISuggest() {
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-tasks', {
        body: {
          asset_type: 'general estate',
          climate: currentEstate?.country === 'CR' ? 'Tropical Costa Rica' : 'Tropical',
          language,
        },
      });
      if (error) throw error;
      setAiSuggestions(data?.suggestions || []);
    } catch (e: any) {
      console.error(e);
      toast.error(es ? 'Error al generar sugerencias' : 'Error generating suggestions');
    } finally {
      setAiLoading(false);
    }
  }

  async function applySuggestion(s: any) {
    if (!currentEstate) return;
    try {
      // Save as template
      await supabase.from('task_templates').insert({
        estate_id: currentEstate.id,
        title: s.title, title_es: s.title_es,
        description: s.description, description_es: s.description_es,
        frequency: s.frequency, priority: s.priority,
        season_months: s.season_months || [],
        is_ai_generated: true,
      });
      // Also create as active task
      await supabase.from('tasks').insert({
        estate_id: currentEstate.id,
        title: s.title, title_es: s.title_es,
        description: s.description, description_es: s.description_es,
        frequency: s.frequency as any, priority: s.priority,
        due_date: new Date().toISOString().split('T')[0],
        status: 'pending',
      });
      toast.success(es ? 'Tarea y plantilla creadas' : 'Task & template created');
      fetchTasks();
      fetchTemplates();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleQuickComplete(task: Task, completed: boolean) {
    try {
      const newStatus = completed ? 'completed' : 'pending';
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
      if (error) throw error;
      if (completed) {
        await supabase.from('task_completions').insert({ task_id: task.id, completed_by_user_id: user?.id, notes: es ? 'Marcado por admin' : 'Marked by admin' });
      }
      toast.success(completed ? (es ? 'Tarea completada' : 'Task completed') : (es ? 'Tarea reabierta' : 'Task reopened'));
      fetchTasks();
    } catch (error) { console.error(error); toast.error(es ? 'Error' : 'Error'); }
  }

  const filteredTasks = tasks.filter(task => {
    if (zoneFilter && task.zone?.id !== zoneFilter) return false;
    switch (activeTab) {
      case 'today': return task.due_date && isToday(parseISO(task.due_date)) && task.status !== 'completed';
      case 'overdue': return task.status === 'overdue';
      case 'completed': return task.status === 'completed';
      case 'recurring': return task.frequency !== 'once' && task.status !== 'completed';
      case 'my': return task.assigned_user?.id === user?.id && task.status !== 'completed';
      default: return task.status !== 'completed';
    }
  });

  const filterZone = zoneFilter ? tasks.find(t => t.zone?.id === zoneFilter)?.zone : null;
  const taskCounts = {
    all: tasks.filter(t => t.status !== 'completed').length,
    today: tasks.filter(t => t.due_date && isToday(parseISO(t.due_date)) && t.status !== 'completed').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
    recurring: tasks.filter(t => t.frequency !== 'once' && t.status !== 'completed').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    my: tasks.filter(t => t.assigned_user?.id === user?.id && t.status !== 'completed').length,
  };

  return (
    <ModernAppLayout>
      <div className="container py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold">{t('tasks.title')}</h1>
            <p className="text-muted-foreground mt-1">{es ? 'Tareas manuales, recurrentes y sugeridas por IA' : 'Manual, recurring & AI-suggested tasks'}</p>
          </div>
          {isOwnerOrManager && (
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={() => { setShowAISuggest(true); handleAISuggest(); }}>
                    <Sparkles className="h-4 w-4 mr-1" />
                    {es ? 'IA' : 'AI'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{es ? 'Sugerencias inteligentes basadas en tus activos' : 'Smart suggestions based on your assets'}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={() => setShowTemplates(true)}>
                    <Repeat className="h-4 w-4 mr-1" />
                    {es ? 'Plantillas' : 'Templates'}
                    {templates.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{templates.length}</Badge>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{es ? 'Ver plantillas de tareas recurrentes' : 'View recurring task templates'}</TooltipContent>
              </Tooltip>
              <Button onClick={() => setShowNewTask(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('tasks.newTask')}
              </Button>
            </div>
          )}
        </div>

        {filterZone && (
          <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: filterZone.color }} />
              <span className="font-medium">{es ? 'Tareas de' : 'Tasks in'}: {filterZone.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setZoneFilter(null)}>{es ? 'Ver todas' : 'Show all'}</Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full sm:w-auto flex-wrap h-auto p-1">
            <TabsTrigger value="all" className="gap-2">{es ? 'Todo' : 'All'}<Badge variant="secondary" className="h-5 px-1.5">{taskCounts.all}</Badge></TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
              {es ? 'Calendario' : 'Calendar'}
            </TabsTrigger>
            <TabsTrigger value="today" className="gap-2">{es ? 'Hoy' : 'Today'}<Badge variant="secondary" className="h-5 px-1.5">{taskCounts.today}</Badge></TabsTrigger>
            <TabsTrigger value="recurring" className="gap-2">
              <Repeat className="h-3.5 w-3.5" />
              {es ? 'Recurrentes' : 'Recurring'}
              <Badge variant="secondary" className="h-5 px-1.5">{taskCounts.recurring}</Badge>
            </TabsTrigger>
            <TabsTrigger value="overdue" className="gap-2">{es ? 'Vencidas' : 'Overdue'}{taskCounts.overdue > 0 && <Badge variant="destructive" className="h-5 px-1.5">{taskCounts.overdue}</Badge>}</TabsTrigger>
            <TabsTrigger value="my" className="gap-2">{es ? 'Mis Tareas' : 'My Tasks'}<Badge variant="secondary" className="h-5 px-1.5">{taskCounts.my}</Badge></TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">{es ? 'Hechas' : 'Done'}<Badge variant="secondary" className="h-5 px-1.5">{taskCounts.completed}</Badge></TabsTrigger>
          </TabsList>

          {/* Calendar View */}
          {activeTab === 'calendar' ? (
            <TaskCalendar
              tasks={tasks}
              language={language}
              onTaskClick={(task) => {
                const fullTask = tasks.find(t => t.id === task.id);
                if (fullTask) { setSelectedTask(fullTask); setCompletionDialogOpen(true); }
              }}
            />
          ) : (

          <div className="space-y-3">
            {loading ? [1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl shimmer" />) : filteredTasks.length === 0 ? (
              <Card className="estate-card"><CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-success/40 mb-4" />
                <h3 className="font-medium text-lg">{es ? '¡Todo al día!' : 'All caught up!'}</h3>
                <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                  {tasks.length === 0
                    ? (es ? 'Crea tu primera tarea manualmente o genera sugerencias basadas en tus activos.' : 'Create your first task manually or get smart suggestions based on your assets.')
                    : (es ? 'Sin tareas en esta categoría' : 'No tasks in this category')}
                </p>
                {tasks.length === 0 && isOwnerOrManager && (
                  <div className="flex gap-3 justify-center mt-4">
                    <Button onClick={() => setShowNewTask(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {es ? 'Nueva Tarea' : 'New Task'}
                    </Button>
                    <Button variant="outline" onClick={() => { setShowAISuggest(true); handleAISuggest(); }}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {es ? 'Sugerencias' : 'Suggestions'}
                    </Button>
                  </div>
                )}
              </CardContent></Card>
            ) : filteredTasks.map(task => {
              const config = statusConfig[task.status];
              return (
                <Card key={task.id} className="estate-card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setSelectedTask(task); setCompletionDialogOpen(true); }}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn('status-dot mt-2 shrink-0', config.dotClass)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{es && task.title_es ? task.title_es : task.title}</h3>
                              {task.frequency !== 'once' && (
                                <Tooltip><TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs gap-1"><Repeat className="h-3 w-3" />{FREQUENCY_OPTIONS.find(f => f.value === task.frequency)?.[es ? 'labelEs' : 'label']}</Badge>
                                </TooltipTrigger><TooltipContent>{es ? 'Tarea recurrente' : 'Recurring task'}</TooltipContent></Tooltip>
                              )}
                            </div>
                            {task.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{es && task.description_es ? task.description_es : task.description}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isOwnerOrManager && (
                              <div onClick={e => e.stopPropagation()}>
                                <Switch checked={task.status === 'completed'} onCheckedChange={checked => handleQuickComplete(task, checked)} className="data-[state=checked]:bg-success" />
                              </div>
                            )}
                            <Badge variant="outline" className={cn('shrink-0', config.badgeClass)}>{es ? config.labelEs : config.label}</Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
                          {task.due_date && <span className="flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" />{format(parseISO(task.due_date), 'MMM d')}</span>}
                          {task.zone && <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.zone.color }} />{task.zone.name}</span>}
                          {task.asset && <span className="flex items-center gap-1"><AssetTypeIcon type={task.asset.asset_type as any} size="sm" />{task.asset.name}</span>}
                          {task.required_photo && <span className="flex items-center gap-1 text-primary"><Camera className="h-3.5 w-3.5" />{es ? 'Foto' : 'Photo'}</span>}
                          {task.frequency !== 'once' && <span className="flex items-center gap-1 text-accent"><Clock className="h-3.5 w-3.5" />{FREQUENCY_OPTIONS.find(f => f.value === task.frequency)?.[es ? 'labelEs' : 'label']}</span>}
                          {task.priority === 1 && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{es ? 'Alta' : 'High'}</Badge>}
                        </div>
                        {task.assigned_user && <div className="flex items-center gap-2 mt-2"><User className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-sm">{task.assigned_user.full_name}</span></div>}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          )}
        </Tabs>

        {/* New Task Dialog */}
        <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{es ? 'Nueva Tarea' : 'New Task'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>{es ? 'Título' : 'Title'} *</Label><Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div className="space-y-2"><Label>{es ? 'Título (ES)' : 'Title (ES)'}</Label><Input value={taskForm.title_es} onChange={e => setTaskForm(f => ({ ...f, title_es: e.target.value }))} /></div>
              <div className="space-y-2"><Label>{es ? 'Descripción' : 'Description'}</Label><Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{es ? 'Frecuencia' : 'Frequency'}</Label>
                  <Select value={taskForm.frequency} onValueChange={v => setTaskForm(f => ({ ...f, frequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{es ? o.labelEs : o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{es ? 'Prioridad' : 'Priority'}</Label>
                  <Select value={String(taskForm.priority)} onValueChange={v => setTaskForm(f => ({ ...f, priority: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{es ? 'Alta' : 'High'}</SelectItem>
                      <SelectItem value="2">{es ? 'Media' : 'Medium'}</SelectItem>
                      <SelectItem value="3">{es ? 'Baja' : 'Low'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{es ? 'Vencimiento' : 'Due date'}</Label>
                  <Input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewTask(false)}>{es ? 'Cancelar' : 'Cancel'}</Button>
              <Button onClick={handleCreateTask}>{es ? 'Crear' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Smart Suggestions Dialog */}
        <Dialog open={showAISuggest} onOpenChange={setShowAISuggest}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {es ? 'Sugerencias Inteligentes' : 'Smart Suggestions'}
              </DialogTitle>
            </DialogHeader>
            {aiLoading ? (
              <div className="py-8 text-center">
                <RefreshCcw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">{es ? 'Analizando tu estate...' : 'Analyzing your estate...'}</p>
              </div>
            ) : aiSuggestions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">{es ? 'Sin sugerencias disponibles' : 'No suggestions available'}</div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {aiSuggestions.map((s, i) => (
                  <Card key={i} className="estate-card">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{es ? s.title_es : s.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{es ? s.description_es : s.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{FREQUENCY_OPTIONS.find(f => f.value === s.frequency)?.[es ? 'labelEs' : 'label']}</Badge>
                            <Badge variant="outline" className="text-xs">{s.priority === 1 ? (es ? 'Alta' : 'High') : s.priority === 2 ? (es ? 'Media' : 'Medium') : (es ? 'Baja' : 'Low')}</Badge>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => applySuggestion(s)}>
                          <Plus className="h-3 w-3 mr-1" />{es ? 'Usar' : 'Use'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAISuggest(false)}>{es ? 'Cerrar' : 'Close'}</Button>
              {!aiLoading && <Button variant="outline" onClick={handleAISuggest}><RefreshCcw className="h-4 w-4 mr-1" />{es ? 'Regenerar' : 'Regenerate'}</Button>}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Templates Dialog */}
        <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{es ? 'Plantillas de Tareas' : 'Task Templates'}</DialogTitle></DialogHeader>
            {templates.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Repeat className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p>{es ? 'Sin plantillas. Usa IA para generar o crea manualmente.' : 'No templates. Use AI to generate or create manually.'}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {templates.map(t => (
                  <Card key={t.id} className="estate-card">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{es && t.title_es ? t.title_es : t.title}</h4>
                            {t.is_ai_generated && <Sparkles className="h-3 w-3 text-primary" />}
                          </div>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{FREQUENCY_OPTIONS.find(f => f.value === t.frequency)?.[es ? 'labelEs' : 'label']}</Badge>
                            <Badge variant={t.enabled ? 'default' : 'secondary'} className="text-xs">{t.enabled ? (es ? 'Activa' : 'Active') : (es ? 'Deshabilitada' : 'Disabled')}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <DialogFooter><Button variant="outline" onClick={() => setShowTemplates(false)}>{es ? 'Cerrar' : 'Close'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <TaskCompletionDialog open={completionDialogOpen} onOpenChange={setCompletionDialogOpen} task={selectedTask} onSuccess={fetchTasks} />
      </div>
    </ModernAppLayout>
  );
}
