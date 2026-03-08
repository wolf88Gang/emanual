import React, { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, getDay, parseISO } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarTask {
  id: string;
  title: string;
  title_es: string | null;
  due_date: string;
  status: string;
  priority: number;
  asset?: { name: string } | null;
}

interface TaskCalendarProps {
  tasks: CalendarTask[];
  language: string;
  onTaskClick: (task: CalendarTask) => void;
}

const statusDot: Record<string, string> = {
  completed: 'bg-success',
  in_progress: 'bg-info',
  overdue: 'bg-destructive',
  pending: 'bg-warning',
};

export function TaskCalendar({ tasks, language, onTaskClick }: TaskCalendarProps) {
  const es = language === 'es';
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month to align with weekday grid
  const startPad = getDay(monthStart); // 0=Sun

  const tasksByDate = useMemo(() => {
    const map: Record<string, CalendarTask[]> = {};
    tasks.forEach(t => {
      if (!t.due_date) return;
      const key = t.due_date.split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  const weekDays = es
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const today = new Date();

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-serif font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es ? esLocale : undefined })}
        </h3>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px text-center">
        {weekDays.map(d => (
          <div key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {/* Empty padding cells */}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="bg-card p-1 min-h-[60px] sm:min-h-[80px]" />
        ))}

        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate[key] || [];
          const isToday = isSameDay(day, today);

          return (
            <div
              key={key}
              className={cn(
                'bg-card p-1 min-h-[60px] sm:min-h-[80px] relative',
                isToday && 'ring-1 ring-primary ring-inset'
              )}
            >
              <span className={cn(
                'text-xs font-medium',
                isToday ? 'text-primary font-bold' : 'text-muted-foreground'
              )}>
                {format(day, 'd')}
              </span>

              <div className="mt-0.5 space-y-0.5 overflow-hidden">
                {dayTasks.slice(0, 3).map(task => (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className={cn(
                      'w-full text-left rounded px-1 py-0.5 text-[10px] sm:text-xs leading-tight truncate transition-colors',
                      'hover:opacity-80 cursor-pointer',
                      task.status === 'completed'
                        ? 'bg-success/15 text-success'
                        : task.status === 'overdue'
                          ? 'bg-destructive/15 text-destructive'
                          : task.priority === 1
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-primary/10 text-primary'
                    )}
                  >
                    {es && task.title_es ? task.title_es : task.title}
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-1">
                    +{dayTasks.length - 3}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
