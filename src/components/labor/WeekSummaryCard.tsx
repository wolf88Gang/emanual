import React from 'react';
import { Users, Clock, CheckCircle2, Banknote, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { WorkerSummary, Currency } from './types';

interface WeekSummaryCardProps {
  language: string;
  currency: Currency;
  hourlyRate: number;
  workerSummaries: WorkerSummary[];
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function WeekSummaryCard({
  language,
  currency,
  hourlyRate,
  workerSummaries,
}: WeekSummaryCardProps) {
  const currencySymbol = currency === 'CRC' ? '₡' : '$';

  const totals = workerSummaries.reduce((acc, w) => ({
    totalMinutes: acc.totalMinutes + w.totalMinutes,
    pendingMinutes: acc.pendingMinutes + w.pendingMinutes,
    approvedMinutes: acc.approvedMinutes + w.approvedMinutes,
    paidMinutes: acc.paidMinutes + w.paidMinutes,
    pendingShifts: acc.pendingShifts + w.pendingShifts,
    approvedShifts: acc.approvedShifts + w.approvedShifts,
    paidShifts: acc.paidShifts + w.paidShifts,
  }), {
    totalMinutes: 0,
    pendingMinutes: 0,
    approvedMinutes: 0,
    paidMinutes: 0,
    pendingShifts: 0,
    approvedShifts: 0,
    paidShifts: 0,
  });

  const pendingPayroll = (totals.approvedMinutes / 60) * hourlyRate;
  const paidPayroll = (totals.paidMinutes / 60) * hourlyRate;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Users className="h-4 w-4" />
            {language === 'es' ? 'Trabajadores' : 'Workers'}
          </div>
          <p className="text-2xl font-bold mt-1">{workerSummaries.length}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Clock className="h-4 w-4" />
            {language === 'es' ? 'Horas Totales' : 'Total Hours'}
          </div>
          <p className="text-2xl font-bold mt-1">{formatMinutes(totals.totalMinutes)}</p>
        </CardContent>
      </Card>

      <Card className="bg-amber-500/5 border-amber-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-amber-600 text-xs">
            <AlertCircle className="h-4 w-4" />
            {language === 'es' ? 'Por Validar' : 'Pending Validation'}
          </div>
          <p className="text-2xl font-bold mt-1 text-amber-600">{totals.pendingShifts}</p>
          <p className="text-xs text-muted-foreground">{formatMinutes(totals.pendingMinutes)}</p>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-primary text-xs">
            <CheckCircle2 className="h-4 w-4" />
            {language === 'es' ? 'Por Pagar' : 'To Pay'}
          </div>
          <p className="text-2xl font-bold mt-1 text-primary">
            {currencySymbol}{pendingPayroll.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">{totals.approvedShifts} {language === 'es' ? 'turnos' : 'shifts'}</p>
        </CardContent>
      </Card>

      <Card className="bg-emerald-500/5 border-emerald-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-emerald-600 text-xs">
            <Banknote className="h-4 w-4" />
            {language === 'es' ? 'Pagado' : 'Paid'}
          </div>
          <p className="text-2xl font-bold mt-1 text-emerald-600">
            {currencySymbol}{paidPayroll.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">{totals.paidShifts} {language === 'es' ? 'turnos' : 'shifts'}</p>
        </CardContent>
      </Card>
    </div>
  );
}
