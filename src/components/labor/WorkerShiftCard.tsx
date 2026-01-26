import React, { useState } from 'react';
import { 
  Clock, 
  MapPin, 
  Camera, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Banknote,
  Edit3
} from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { WorkerSummary, WorkerShift, ValidationStatus } from './types';

interface WorkerShiftCardProps {
  worker: WorkerSummary;
  language: string;
  currency: 'USD' | 'CRC';
  hourlyRate: number;
  onValidateShift: (shift: WorkerShift) => void;
  onPayShift: (shift: WorkerShift) => void;
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function getStatusBadge(status: ValidationStatus | undefined, language: string) {
  const config: Record<ValidationStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; labelEs: string }> = {
    pending: { variant: 'outline', label: 'Pending', labelEs: 'Pendiente' },
    approved: { variant: 'default', label: 'Approved', labelEs: 'Aprobado' },
    adjusted: { variant: 'secondary', label: 'Adjusted', labelEs: 'Ajustado' },
    rejected: { variant: 'destructive', label: 'Rejected', labelEs: 'Rechazado' },
    paid: { variant: 'default', label: 'Paid', labelEs: 'Pagado' },
  };

  const currentStatus = status || 'pending';
  const statusConfig = config[currentStatus];

  return (
    <Badge variant={statusConfig.variant} className={currentStatus === 'paid' ? 'bg-emerald-600' : ''}>
      {language === 'es' ? statusConfig.labelEs : statusConfig.label}
    </Badge>
  );
}

export function WorkerShiftCard({ 
  worker, 
  language, 
  currency, 
  hourlyRate,
  onValidateShift,
  onPayShift 
}: WorkerShiftCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dateLocale = language === 'es' ? es : undefined;
  const currencySymbol = currency === 'CRC' ? '₡' : '$';

  const calculatePay = (minutes: number) => {
    return (minutes / 60) * hourlyRate;
  };

  const pendingPay = calculatePay(worker.approvedMinutes);
  const paidAmount = calculatePay(worker.paidMinutes);

  // Group shifts by date
  const shiftsByDate = worker.shifts.reduce((acc, shift) => {
    const date = format(parseISO(shift.check_in_at), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(shift);
    return acc;
  }, {} as Record<string, WorkerShift[]>);

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={worker.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {worker.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{worker.userName}</h3>
                  <p className="text-sm text-muted-foreground">{worker.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{formatMinutes(worker.totalMinutes)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {worker.totalShifts} {language === 'es' ? 'turnos' : 'shifts'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {worker.pendingShifts > 0 && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                      {worker.pendingShifts} {language === 'es' ? 'pendiente' : 'pending'}
                    </Badge>
                  )}
                  {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">
                  {language === 'es' ? 'Total' : 'Total'}
                </div>
                <div className="font-mono font-semibold">{formatMinutes(worker.totalMinutes)}</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-500/10">
                <div className="text-xs text-amber-600 mb-1">
                  {language === 'es' ? 'Pendiente' : 'Pending'}
                </div>
                <div className="font-mono font-semibold text-amber-600">{formatMinutes(worker.pendingMinutes)}</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-primary/10">
                <div className="text-xs text-primary mb-1">
                  {language === 'es' ? 'Aprobado' : 'Approved'}
                </div>
                <div className="font-mono font-semibold text-primary">
                  {currencySymbol}{pendingPay.toFixed(2)}
                </div>
              </div>
              <div className="text-center p-2 rounded-lg bg-emerald-500/10">
                <div className="text-xs text-emerald-600 mb-1">
                  {language === 'es' ? 'Pagado' : 'Paid'}
                </div>
                <div className="font-mono font-semibold text-emerald-600">
                  {currencySymbol}{paidAmount.toFixed(2)}
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {Object.entries(shiftsByDate).map(([date, dayShifts]) => (
                <div key={date} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 font-medium text-sm">
                    {format(parseISO(date), 'EEEE, d MMMM', { locale: dateLocale })}
                  </div>
                  <div className="divide-y">
                    {dayShifts.map(shift => {
                      const duration = shift.check_out_at 
                        ? differenceInMinutes(parseISO(shift.check_out_at), parseISO(shift.check_in_at))
                        : 0;
                      const effectiveMinutes = shift.validation?.adjusted_minutes ?? duration;
                      const status = shift.validation?.status || 'pending';
                      const hasEvidence = shift.check_in_photo_url || shift.check_out_photo_url;
                      const hasLocation = shift.check_in_lat && shift.check_in_lng;

                      return (
                        <div key={shift.id} className="p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-mono text-sm">
                                    {format(parseISO(shift.check_in_at), 'HH:mm')}
                                    {' → '}
                                    {shift.check_out_at 
                                      ? format(parseISO(shift.check_out_at), 'HH:mm')
                                      : <span className="text-amber-600">{language === 'es' ? 'En curso' : 'Ongoing'}</span>
                                    }
                                  </span>
                                </div>
                                
                                <span className="font-mono text-sm font-medium">
                                  {formatMinutes(duration)}
                                  {shift.validation?.adjusted_minutes && shift.validation.adjusted_minutes !== duration && (
                                    <span className="text-muted-foreground line-through ml-2">
                                      {formatMinutes(duration)}
                                    </span>
                                  )}
                                </span>

                                {getStatusBadge(status, language)}
                              </div>

                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                {hasLocation && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    GPS
                                  </span>
                                )}
                                {hasEvidence && (
                                  <span className="flex items-center gap-1">
                                    <Camera className="h-3 w-3" />
                                    {language === 'es' ? 'Foto' : 'Photo'}
                                  </span>
                                )}
                                {shift.notes && (
                                  <span className="truncate max-w-[200px]">
                                    "{shift.notes}"
                                  </span>
                                )}
                              </div>

                              {shift.validation?.decision_message && (
                                <div className="mt-2 text-xs bg-muted/50 rounded p-2 italic">
                                  "{shift.validation.decision_message}"
                                  {shift.validation.reviewer && (
                                    <span className="text-muted-foreground not-italic ml-2">
                                      — {shift.validation.reviewer.full_name || shift.validation.reviewer.email}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {status === 'pending' && shift.check_out_at && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onValidateShift(shift);
                                  }}
                                >
                                  <Edit3 className="h-4 w-4 mr-1" />
                                  {language === 'es' ? 'Validar' : 'Validate'}
                                </Button>
                              )}
                              {(status === 'approved' || status === 'adjusted') && (
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPayShift(shift);
                                  }}
                                >
                                  <Banknote className="h-4 w-4 mr-1" />
                                  {language === 'es' ? 'Pagar' : 'Pay'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
