import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AssetTypeIcon } from '@/components/icons/AssetTypeIcon';

interface Task {
  id: string;
  title: string;
  title_es?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  due_date: string;
  required_photo: boolean;
  asset?: {
    id: string;
    name: string;
    asset_type: string;
  };
  zone?: {
    id: string;
    name: string;
  };
}

interface TasksOverviewCardProps {
  tasks: Task[];
  className?: string;
}

const statusConfig = {
  pending: {
    dotClass: 'status-pending',
    label: 'Pending',
    labelEs: 'Pendiente',
  },
  in_progress: {
    dotClass: 'status-in-progress',
    label: 'In Progress',
    labelEs: 'En Progreso',
  },
  completed: {
    dotClass: 'status-completed',
    label: 'Completed',
    labelEs: 'Completado',
  },
  overdue: {
    dotClass: 'status-overdue',
    label: 'Overdue',
    labelEs: 'Atrasado',
  },
};

export function TasksOverviewCard({ tasks, className }: TasksOverviewCardProps) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const overdueCount = tasks.filter(t => t.status === 'overdue').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;

  return (
    <Card className={cn('estate-card', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t('dashboard.todaysTasks')}
          </CardTitle>
          <div className="flex gap-2">
            {overdueCount > 0 && (
              <Badge variant="destructive" className="animate-pulse-subtle">
                {overdueCount} {t('tasks.overdue')}
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge variant="secondary">
                {pendingCount} {t('tasks.pending')}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-success" />
            <p>All caught up!</p>
            <p className="text-sm mt-1">No tasks due today</p>
          </div>
        ) : (
          <>
            {tasks.slice(0, 5).map((task) => {
              const config = statusConfig[task.status];
              
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <div className={cn('status-dot shrink-0', config.dotClass)} />
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {language === 'es' && task.title_es 
                        ? task.title_es 
                        : task.title}
                    </p>
                    {task.zone && (
                      <p className="text-xs text-muted-foreground truncate">
                        {task.zone.name}
                        {task.asset && ` • ${task.asset.name}`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.asset && (
                      <AssetTypeIcon 
                        type={task.asset.asset_type as any} 
                        size="sm" 
                      />
                    )}
                    {task.required_photo && (
                      <Camera className="h-4 w-4 text-muted-foreground" />
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
            
            {tasks.length > 5 && (
              <Button 
                variant="ghost" 
                className="w-full" 
                size="sm"
                onClick={() => navigate('/tasks')}
              >
                {t('dashboard.viewAllTasks')} ({tasks.length})
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
