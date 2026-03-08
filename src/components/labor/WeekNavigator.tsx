import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isThisWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';

interface WeekNavigatorProps {
  weekStart: Date;
  onWeekChange: (newWeekStart: Date) => void;
  language: string;
}

export function WeekNavigator({ weekStart, onWeekChange, language }: WeekNavigatorProps) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const dateLocale = language === 'es' ? es : undefined;
  const isCurrentWeek = isThisWeek(weekStart, { weekStartsOn: 1 });
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onWeekChange(startOfWeek(date, { weekStartsOn: 1 }));
      setCalendarOpen(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => onWeekChange(subWeeks(weekStart, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="text-center flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg px-4 py-2 transition-colors">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {format(weekStart, 'dd MMM', { locale: dateLocale })} 
                    {' — '}
                    {format(weekEnd, 'dd MMM yyyy', { locale: dateLocale })}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {language === 'es' ? 'Semana laboral' : 'Work week'}
                    </p>
                    {isCurrentWeek && (
                      <Badge variant="secondary" className="text-xs">
                        {language === 'es' ? 'Esta semana' : 'This week'}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <CalendarPicker
                mode="single"
                selected={weekStart}
                onSelect={handleDateSelect}
                locale={dateLocale}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => onWeekChange(addWeeks(weekStart, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {!isCurrentWeek && (
          <div className="mt-3 text-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              {language === 'es' ? 'Ir a esta semana' : 'Go to this week'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
